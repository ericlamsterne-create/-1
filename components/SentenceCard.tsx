import React, { useState } from 'react';
import { SentenceData, WordDefinition } from '../types';
import { Edit3, X, Loader2, Sparkles, Check } from 'lucide-react';
import { getSynonyms, getWordDefinition } from '../services/geminiService';

interface SentenceCardProps {
  data: SentenceData;
  corePhrase: string;
  onUpdate: (field: keyof SentenceData, value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  index: number;
}

const SentenceCard: React.FC<SentenceCardProps> = ({ 
  data, 
  corePhrase, 
  onUpdate,
  onGenerate,
  isGenerating
}) => {
  const [popover, setPopover] = useState<{ x: number, y: number, type: 'synonym' | 'def' } | null>(null);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [targetWord, setTargetWord] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);

  const handleTextDoubleClick = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text) return;
    
    const cleanText = text.replace(/[.,!?;:()]/g, '');
    if (!cleanText) return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const isCore = corePhrase ? corePhrase.split(/[ ,]+/).some(phrase => cleanText.toLowerCase().includes(phrase.toLowerCase())) : false;
    
    setTargetWord(cleanText);
    setIsLoading(true);

    if (isCore) {
        setPopover({ x: rect.left, y: rect.bottom + 10, type: 'synonym' });
        const [synList, defData] = await Promise.all([
            getSynonyms(data.content, cleanText),
            getWordDefinition(cleanText)
        ]);
        setSynonyms(synList);
        setDefinition(defData);
    } else {
        setPopover({ x: rect.left, y: rect.bottom + 10, type: 'def' });
        const defData = await getWordDefinition(cleanText);
        setDefinition(defData);
        setSynonyms([]);
    }
    setIsLoading(false);
  };

  const applySynonym = (synonym: string) => {
    if (!popover) return;
    const regex = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`);
    const newText = data.content.replace(regex, `${targetWord} / ${synonym}`);
    onUpdate('content', newText);
    setPopover(null);
    setSynonyms([]);
  };

  const handleManualConfirm = () => {
    if (data.draftInput && data.draftInput.trim()) {
        onUpdate('content', data.draftInput);
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderHighlightedText = () => {
    if (!corePhrase || !data.content) return <span className="text-zinc-600 italic">等待生成...</span>;
    
    // 1. Identify ranges for Core Phrase
    const phrases = corePhrase.split(/[ ,]+/).map(p => p.trim()).filter(Boolean);
    
    // 2. Identify ranges for Patterns (if any)
    const patterns = data.patterns || [];

    // Helper to highlight logic
    // We split by words/spaces to allow partial highlighting, but regex approach is better for preserving structure.
    
    let parts: { text: string, type: 'normal' | 'core' | 'pattern' }[] = [{ text: data.content, type: 'normal' }];

    // Function to apply highlighting to the parts array
    const applyHighlight = (searchTerms: string[], type: 'core' | 'pattern') => {
        if (searchTerms.length === 0) return;
        
        const newParts: typeof parts = [];
        
        // Construct regex
        let patternStr = "";
        if (type === 'core') {
            // Enhanced Regex for Core: Matches phrase + optional " / synonym"
            const pGroup = searchTerms.map(p => escapeRegExp(p)).join('|');
            patternStr = `(${pGroup}(?:\\s*\\/\\s*[\\w\\s-]+)*)`;
        } else {
            // Simple match for Patterns
            patternStr = `(${searchTerms.map(p => escapeRegExp(p)).join('|')})`;
        }

        const regex = new RegExp(patternStr, 'gi');

        parts.forEach(part => {
            // If part is already highlighted, keep it as is (Priority: Core > Pattern)
            if (part.type !== 'normal') {
                newParts.push(part);
                return;
            }
            
            const split = part.text.split(regex);
            split.forEach(s => {
                if (!s) return;
                // Check if this segment matches one of our terms
                const isMatch = searchTerms.some(term => {
                     if (type === 'core') return s.toLowerCase().trim().startsWith(term.toLowerCase());
                     return s.toLowerCase().includes(term.toLowerCase());
                });
                
                if (isMatch) {
                    newParts.push({ text: s, type });
                } else {
                    newParts.push({ text: s, type: 'normal' });
                }
            });
        });
        parts = newParts;
    };

    // Apply Core First (Priority 1)
    applyHighlight(phrases, 'core');
    // Apply Patterns Second (Priority 2 - will only affect 'normal' text)
    applyHighlight(patterns, 'pattern');

    return (
        <div onDoubleClick={handleTextDoubleClick} className="cursor-pointer leading-relaxed text-lg text-zinc-300">
            {parts.map((part, i) => {
                if (part.type === 'core') {
                     return (
                        <span key={i} className="font-bold text-green-400 bg-green-900/30 rounded px-1.5 py-0.5 border-b-2 border-green-600 transition-colors hover:text-green-300 shadow-[0_0_10px_rgba(74,222,128,0.2)]" title="核心词组">
                            {part.text}
                        </span>
                    );
                } else if (part.type === 'pattern') {
                    return (
                        <span key={i} className="text-sky-300 border-b-2 border-dashed border-sky-500/50 hover:bg-sky-500/10 transition-colors" title="常用句式">
                            {part.text}
                        </span>
                    );
                }
                return <span key={i}>{part.text}</span>;
            })}
        </div>
    );
  };

  return (
    <div className="bg-zinc-900 rounded-3xl shadow-lg border border-zinc-800 p-6 transition-all duration-300 hover:border-zinc-700">
      <div className="flex justify-between items-center mb-4">
        {isEditingType ? (
            <input 
                type="text" 
                defaultValue={data.type}
                autoFocus
                onBlur={(e) => {
                    onUpdate('type', e.target.value);
                    setIsEditingType(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onUpdate('type', e.currentTarget.value);
                        setIsEditingType(false);
                    }
                }}
                className="bg-zinc-800 text-zinc-200 text-xs font-bold rounded-md px-2 py-1 border border-zinc-600 outline-none focus:border-green-500 w-48"
            />
        ) : (
            <span 
                onDoubleClick={() => setIsEditingType(true)}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-text hover:border-green-500/50 hover:text-zinc-200 transition-colors"
                title="双击修改类型"
            >
                {data.type}
            </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
            <textarea
            value={data.draftInput || ""}
            onChange={(e) => onUpdate('draftInput', e.target.value)}
            placeholder={`在此输入语境或想法 (中文/英文)...`}
            className="flex-1 text-sm bg-zinc-950 text-zinc-400 border-none rounded-xl p-4 focus:ring-1 focus:ring-green-500/50 resize-none transition-all placeholder:text-zinc-700"
            rows={2}
            />
            <div className="flex flex-col gap-2">
                 <button 
                    onClick={handleManualConfirm}
                    disabled={!data.draftInput || !data.draftInput.trim()}
                    className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-green-500 border border-zinc-700 flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
                    title="手动确认"
                >
                    <Check className="w-4 h-4"/>
                </button>
                <button 
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-10 h-10 rounded-xl bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-600/30 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                    title="AI 生成/润色"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                </button>
            </div>
        </div>

        <div className="relative group min-h-[4rem] flex items-center pl-1 bg-zinc-950/30 rounded-xl p-4 border border-zinc-800/50">
            {renderHighlightedText()}
            <button 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-green-400 transition-opacity"
                onClick={() => {
                    const newVal = prompt("手动编辑句子:", data.content);
                    if (newVal !== null) onUpdate('content', newVal);
                }}
            >
                <Edit3 className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {/* Popover logic remains same */}
      {popover && (
        <div 
            className="fixed z-50 bg-zinc-800 rounded-xl shadow-xl border border-zinc-700 w-64 p-4 animate-in fade-in zoom-in duration-200"
            style={{ left: Math.min(popover.x, window.innerWidth - 270), top: popover.y }}
        >
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-green-500 uppercase">
                    {popover.type === 'synonym' ? '同义词 & 释义' : '单词释义'}
                </h4>
                <button onClick={() => setPopover(null)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-green-500" /></div>
            ) : (
                <div className="space-y-4">
                    {definition && (
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-lg font-bold text-white">{definition.word}</span>
                                <span className="text-xs text-zinc-500 font-mono">[{definition.ipa}]</span>
                            </div>
                            <div className="text-sm text-zinc-300">{definition.definition}</div>
                        </div>
                    )}

                    {popover.type === 'synonym' && (
                        <div className="flex flex-col gap-2">
                            <div className="text-[10px] uppercase text-zinc-500 font-bold">替换建议</div>
                            {synonyms.map((syn, idx) => (
                                <button key={idx} onClick={() => applySynonym(syn)} className="text-left px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-700/50 hover:bg-green-900/30 hover:text-green-300 rounded-lg transition-colors">
                                    {syn}
                                </button>
                            ))}
                            {synonyms.length === 0 && <span className="text-zinc-600 text-sm">无同义词建议</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SentenceCard;