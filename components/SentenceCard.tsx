
import React, { useState, useRef, useEffect } from 'react';
import { SentenceData, WordDefinition, AccentType, PronunciationResult } from '../types';
import { Edit3, X, Loader2, Sparkles, Check, MessageSquare, Lightbulb, Volume2, Mic, StopCircle, Play, Pause, Bookmark, ChevronRight } from 'lucide-react';
import { getSynonyms, getWordDefinition, evaluatePronunciation } from '../services/geminiService';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';

interface SentenceCardProps {
  data: SentenceData;
  corePhrase: string;
  onUpdate: (field: keyof SentenceData, value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  index: number;
  voiceId: string;
  accent: AccentType;
  globalPlayingId: string | null;
  isGlobalLoading?: boolean;
  onGlobalPlay: (id: string, text: string) => void;
  onOptimize?: (text: string) => void;
}

const SentenceCard: React.FC<SentenceCardProps> = ({ 
  data, 
  corePhrase, 
  onUpdate,
  onGenerate,
  isGenerating,
  index,
  voiceId,
  accent,
  globalPlayingId,
  isGlobalLoading,
  onGlobalPlay,
  onOptimize
}) => {
  const [popover, setPopover] = useState<{ x: number, y: number, type: 'synonym' | 'def', align: 'top' | 'bottom' } | null>(null);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [targetWord, setTargetWord] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Audio State
  const contentAudioId = `card-${index}-content`;
  const topicAudioId = `card-${index}-topic`;
  
  const isPlayingContent = globalPlayingId === contentAudioId;
  const isLoadingContent = isGlobalLoading && isPlayingContent;
  const isPlayingTopic = globalPlayingId === topicAudioId;
  const isLoadingTopic = isGlobalLoading && isPlayingTopic;

  const [isRecording, setIsRecording] = useState(false);
  const [evalResult, setEvalResult] = useState<PronunciationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Grey out finalized content, but allow hover to restore
  const isFinalized = !!data.content;
  const cardStyle = isFinalized 
    ? "bg-zinc-900 border-zinc-800 opacity-80 hover:opacity-100 grayscale-[0.3] hover:grayscale-0" 
    : "bg-zinc-900 border-zinc-800 shadow-lg hover:border-zinc-700";

  const handleTextMouseUp = async (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection) return;

    let text = selection.toString().trim();
    let rect: DOMRect | null = null;

    if (!text) {
        if (e.target instanceof Node) {
           const doc = document as any;
           if (doc.caretRangeFromPoint) {
                const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
                if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                    const node = range.startContainer;
                    const offset = range.startOffset;
                    const content = node.textContent || "";
                    let start = offset;
                    let end = offset;
                    while (start > 0 && /[\w'-]/.test(content[start - 1])) start--;
                    while (end < content.length && /[\w'-]/.test(content[end])) end++;
                    if (start < end) {
                        text = content.slice(start, end).trim();
                        // Create a range to get rect for the single word click
                        const wordRange = document.createRange();
                        wordRange.setStart(node, start);
                        wordRange.setEnd(node, end);
                        rect = wordRange.getBoundingClientRect();
                    }
                }
           }
        }
    } else {
        const range = selection.getRangeAt(0);
        rect = range.getBoundingClientRect();
    }

    if (!text || !rect) return;
    const cleanText = text.replace(/[.,!?;:()]/g, '');
    if (!cleanText) return;

    // Smart Positioning
    const POPOVER_WIDTH = 280;
    const ESTIMATED_HEIGHT = 300;
    const SCREEN_PADDING = 16;

    // 1. Horizontal: Center relative to selection, clamp to screen edges
    let left = rect.left + (rect.width / 2) - (POPOVER_WIDTH / 2);
    left = Math.max(SCREEN_PADDING, Math.min(left, window.innerWidth - POPOVER_WIDTH - SCREEN_PADDING));

    // 2. Vertical: Check space below, flip if needed
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top = 0;
    let align: 'top' | 'bottom' = 'bottom'; // Default: show below the text

    if (spaceBelow < ESTIMATED_HEIGHT && spaceAbove > ESTIMATED_HEIGHT) {
        // Not enough space below, but enough above -> Flip to Top
        top = rect.top - 10; // Will adjust by height via CSS transform translateY(-100%) later if needed, but simpler to set bottom css
        align = 'top';
    } else {
        // Show below
        top = rect.bottom + 10;
        align = 'bottom';
    }

    setTargetWord(cleanText);
    setIsLoading(true);
    setPopover({ x: left, y: top, type: cleanText.includes(' ') ? 'synonym' : 'def', align });

    const isPhrase = cleanText.includes(' ');
    
    if (isPhrase) {
        const synList = await getSynonyms(data.content, cleanText);
        setSynonyms(synList);
        setDefinition(null);
    } else {
        const [synList, defData] = await Promise.all([
            getSynonyms(data.content, cleanText),
            getWordDefinition(cleanText)
        ]);
        setSynonyms(synList);
        setDefinition(defData);
    }
    setIsLoading(false);
    selection.removeAllRanges();
  };

  const applySynonym = (synonym: string) => {
    if (!popover) return;
    const regex = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`);
    const newText = data.content.replace(regex, `${targetWord} / ${synonym}`);
    onUpdate('content', newText);
    setPopover(null);
    setSynonyms([]);
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];
          mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              setIsEvaluating(true);
              const result = await evaluatePronunciation(blob, data.content, accent);
              setEvalResult(result);
              setIsEvaluating(false);
              setIsRecording(false);
              stream.getTracks().forEach(t => t.stop());
          };
          mediaRecorder.start();
          setIsRecording(true);
          setEvalResult(null); 
      } catch (e) { alert("Mic Error"); }
  };

  const stopRecording = () => {
      mediaRecorderRef.current?.stop();
  };
  
  const handleCheck = async () => {
      if (!data.draftInput || !data.draftInput.trim() || !onOptimize) return;
      setIsOptimizing(true);
      try {
          await onOptimize(data.draftInput);
      } finally {
          setIsOptimizing(false);
      }
  };

  const renderHighlightedText = () => {
    if (!corePhrase || !data.content) return <span className="text-zinc-600 italic">等待生成...</span>;
    const phrases = corePhrase.split(/[,，]+/).map(p => p.trim()).filter(Boolean);
    const patterns = data.patterns || [];
    
    let parts: { text: string, type: 'normal' | 'core' | 'pattern' }[] = [{ text: data.content, type: 'normal' }];

    const applyHighlight = (searchTerms: string[], type: 'core' | 'pattern') => {
        if (searchTerms.length === 0) return;
        const pGroup = searchTerms.map(p => escapeRegExp(p)).join('|');
        const patternStr = type === 'core' ? `(${pGroup}(?:\\s*\\/\\s*[\\w\\s-]+)*)` : `(${pGroup})`;
        const regex = new RegExp(patternStr, 'gi');

        const newParts: typeof parts = [];
        parts.forEach(part => {
            if (part.type !== 'normal') { newParts.push(part); return; }
            const split = part.text.split(regex);
            split.forEach(s => {
                if (!s) return;
                const isMatch = searchTerms.some(term => {
                     // Robust check: Ignore case and whitespace differences
                     if (type === 'core') return s.toLowerCase().trim().startsWith(term.toLowerCase());
                     return s.toLowerCase().includes(term.toLowerCase());
                });
                newParts.push({ text: s, type: isMatch ? type : 'normal' });
            });
        });
        parts = newParts;
    };

    // Apply Core Phrases first
    applyHighlight(phrases, 'core');
    // Apply Patterns second
    applyHighlight(patterns, 'pattern');

    return (
        <div onMouseUp={handleTextMouseUp} className="cursor-text leading-relaxed text-lg text-zinc-300">
            {parts.map((part, i) => {
                if (part.type === 'core') return <span key={i} className="font-bold text-green-400 bg-green-900/30 rounded px-1.5 py-0.5 border-b-2 border-green-600 shadow-[0_0_10px_rgba(74,222,128,0.2)]">{part.text}</span>;
                // Stronger visual for Formula/Logic patterns (Blue)
                if (part.type === 'pattern') return <span key={i} className="text-blue-300 bg-blue-900/40 rounded px-1 font-bold border-b border-blue-500/50">{part.text}</span>;
                return <span key={i}>{part.text}</span>;
            })}
        </div>
    );
  };

  const getShortType = (fullType: string) => {
      const match = fullType.match(/\((.*?)\)/);
      return match ? match[1] : fullType;
  };

  // Close popover when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
              setPopover(null);
          }
      };
      if (popover) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [popover]);

  return (
    <div className={`rounded-3xl p-6 transition-all duration-300 relative ${cardStyle}`}>
      
      {/* Type Label */}
      <div className="flex justify-between items-center mb-4">
        <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-zinc-800 text-zinc-400 border border-zinc-700"
        >
            {getShortType(data.type)}
        </span>
        {data.questionSource && (
            <span className="text-[10px] font-bold text-green-600 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">
                {data.questionSource}
            </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Input Area */}
        <div className="flex gap-3">
            <textarea
                value={data.draftInput || ""}
                onChange={(e) => onUpdate('draftInput', e.target.value)}
                placeholder={`在此输入语境或想法 (中文/英文)...`}
                className="flex-1 text-sm bg-zinc-950 text-zinc-400 border-none rounded-xl p-4 focus:ring-1 focus:ring-green-500/50 resize-none transition-all placeholder:text-zinc-700"
                rows={2}
            />
            <div className="flex flex-col gap-2 shrink-0">
                 <button 
                    onClick={handleCheck}
                    disabled={!data.draftInput || !data.draftInput.trim() || isOptimizing}
                    className="w-12 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-green-500 border border-zinc-700 flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 shadow-md"
                    title="确认并优化"
                >
                    {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                </button>
                <button 
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-12 h-10 rounded-xl bg-green-600 hover:bg-green-500 text-white border border-green-500/50 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-green-900/30"
                    title="AI 生成"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="relative group min-h-[4rem] bg-zinc-950/30 rounded-xl p-5 border border-zinc-800/50">
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

            {/* Audio Controls Footer */}
            {data.content && (
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800/30">
                     <button 
                        onClick={() => onGlobalPlay(contentAudioId, data.content)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPlayingContent ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isLoadingContent ? <Loader2 className="w-3 h-3 animate-spin"/> : isPlayingContent ? <Pause className="w-3 h-3 fill-current"/> : <Play className="w-3 h-3 fill-current"/>}
                        {isLoadingContent ? 'Loading...' : isPlayingContent ? 'Playing' : 'Listen'}
                     </button>

                     <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isEvaluating}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isEvaluating ? <Loader2 className="w-3 h-3 animate-spin"/> : isRecording ? <StopCircle className="w-3 h-3"/> : <Mic className="w-3 h-3"/>}
                        {isRecording ? 'Stop' : 'Evaluate'}
                     </button>
                </div>
            )}
            
            {/* Pronunciation Result */}
            {evalResult && (
                <div className="mt-3 bg-zinc-900 rounded-lg p-3 border border-zinc-800 flex items-start gap-3 animate-in slide-in-from-top-2">
                    <div className={`text-xl font-black ${evalResult.score > 80 ? 'text-green-500' : 'text-orange-500'}`}>{evalResult.score}</div>
                    <div className="text-xs text-zinc-400 flex-1">
                        <div className="mb-1">{evalResult.feedback}</div>
                        <div className="flex flex-wrap gap-1">
                             {evalResult.mistakes.map((m, i) => <span key={i} className="px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded text-[10px]">{m}</span>)}
                        </div>
                    </div>
                    <button onClick={() => setEvalResult(null)}><X className="w-3 h-3 text-zinc-600"/></button>
                </div>
            )}
        </div>

        {/* IELTS Topic & Logic */}
        {(data.ieltsTopic || data.logic) && (
            <div className="space-y-2 select-none">
                 {data.ieltsTopic && (
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                         <button 
                            onClick={() => onGlobalPlay(topicAudioId, data.ieltsTopic!)}
                            className={`p-1.5 rounded-md transition-colors ${isPlayingTopic ? 'bg-green-900/30 text-green-500' : 'text-zinc-500 hover:bg-zinc-800'}`}
                        >
                             {isLoadingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Volume2 className="w-3.5 h-3.5"/>}
                         </button>
                        <div className="text-[11px] font-medium text-gray-500 leading-tight flex-1">
                            <span className="text-zinc-600">Q:</span> {data.ieltsTopic}
                        </div>
                    </div>
                )}
                {data.logic && (
                    <div className="flex items-start gap-2 bg-yellow-900/10 p-2 rounded-lg border border-yellow-900/20">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-600/70"/>
                        <span className="text-[11px] font-medium text-zinc-400 leading-tight">
                            {data.logic.replace(/^(思路|Logic)[:：]?\s*/i, '')}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>
      
      {/* Improved Popover */}
      {popover && (
        <div 
            ref={popoverRef}
            className="fixed z-[100] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700 w-72 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                left: popover.x, 
                top: popover.align === 'bottom' ? popover.y : 'auto',
                bottom: popover.align === 'top' ? (window.innerHeight - popover.y) : 'auto'
            }}
        >
            <div className="flex justify-between items-center p-3 bg-zinc-800/50 border-b border-zinc-700/50">
                <h4 className="text-xs font-bold text-green-500 uppercase flex items-center gap-2">
                    {popover.type === 'synonym' ? <Sparkles className="w-3 h-3"/> : <Bookmark className="w-3 h-3"/>}
                    {popover.type === 'synonym' ? '词汇替换' : '单词释义'}
                </h4>
                <button onClick={() => setPopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar bg-zinc-900">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 text-zinc-500 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        <span className="text-xs">AI 思考中...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {definition && (
                            <div className="bg-black/20 rounded-lg p-3 border border-zinc-800">
                                <div className="flex gap-2 mb-1.5 items-baseline">
                                    <span className="text-xl font-bold text-white tracking-tight">{definition.word}</span>
                                    {definition.ipa && <span className="text-xs text-zinc-500 font-mono">[{definition.ipa}]</span>}
                                </div>
                                <div className="text-sm text-zinc-300 leading-relaxed font-medium border-t border-zinc-800 pt-2 mt-1">{definition.definition}</div>
                            </div>
                        )}
                        {synonyms.length > 0 && (
                            <div>
                                 <h5 className="text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
                                     <Sparkles className="w-3 h-3"/> 推荐替换 (Synonyms)
                                 </h5>
                                 <div className="space-y-1">
                                     {synonyms.map((syn, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => applySynonym(syn)} 
                                            className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 bg-zinc-800/50 hover:bg-green-600 hover:text-white rounded-lg transition-all border border-zinc-800 hover:border-green-500 group flex items-center justify-between"
                                        >
                                            <span>{syn}</span>
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!definition && synonyms.length === 0 && (
                            <div className="text-center py-4 text-zinc-500 text-xs">暂无相关释义或替换</div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default SentenceCard;
