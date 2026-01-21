
import React, { useState } from 'react';
import { LogicFormula } from '../types';
import { Lightbulb, Info, Copy, Edit3, X, RefreshCw, Save } from 'lucide-react';
import { generateFormulaExample } from '../services/geminiService';

interface FormulaDisplayProps {
    formula: LogicFormula;
    onUpdateFormula?: (updated: LogicFormula) => void;
}

const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ formula, onUpdateFormula }) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedSkeleton, setEditedSkeleton] = useState<string>("");
    const [isGeneratingExample, setIsGeneratingExample] = useState(false);

    // Parse tags: <Y>, <P>, <G>, <B> and []
    // Keep this for displaying default formulas that still have tags
    const renderStyledText = (text: string) => {
        // If text has no tags, return simpler render
        if (!text.includes('<')) {
            return renderInnerContent(text);
        }

        const parts = text.split(/(<[YPG]>.*?<\/[YPG]>)/g);
        
        return parts.map((part, idx) => {
            if (part.startsWith('<Y>')) {
                const content = part.replace(/<\/?Y>/g, '');
                // Yellow (Main point)
                return <span key={idx} className="bg-[#FFF9C4] text-slate-900 px-1 mx-0.5 rounded-sm shadow-sm decoration-clone leading-loose border-b-2 border-[#FBC02D]/20">{renderInnerContent(content)}</span>;
            }
            if (part.startsWith('<P>')) {
                const content = part.replace(/<\/?P>/g, '');
                // Blue/Purple (Method/Condition)
                return <span key={idx} className="bg-[#D1C4E9] text-slate-900 px-1 mx-0.5 rounded-sm shadow-sm decoration-clone leading-loose border-b-2 border-[#7E57C2]/20">{renderInnerContent(content)}</span>;
            }
            if (part.startsWith('<G>')) {
                const content = part.replace(/<\/?G>/g, '');
                // Green (Impact/Details)
                return <span key={idx} className="bg-[#DCEDC8] text-slate-900 px-1 mx-0.5 rounded-sm shadow-sm decoration-clone leading-loose border-b-2 border-[#AED581]/20">{renderInnerContent(content)}</span>;
            }
            if (part.trim() === "") return null;
            return <span key={idx}>{renderInnerContent(part)}</span>;
        });
    };

    const renderInnerContent = (text: string) => {
        // Handles <B>...</B> and [...] placeholders
        const parts = text.split(/(<B>.*?<\/B>|\[.*?\])/g);
        return parts.map((part, i) => {
            if (part.startsWith('<B>')) {
                return <strong key={i} className="font-black text-slate-950">{part.replace(/<\/?B>/g, '')}</strong>;
            }
            if (part.startsWith('[') && part.endsWith(']')) {
                // Placeholder styling (e.g. [原因A]) -> Remove brackets for display
                const content = part.slice(1, -1);
                return <span key={i} className="font-bold text-slate-500 mx-0.5 bg-slate-100 px-1 rounded text-xs tracking-wide">{content}</span>;
            }
            return part;
        });
    };

    const handleCopy = (skeleton: string[]) => {
        // Strip tags for clean copy and join with NEWLINE
        const cleanText = skeleton.map(line => line.replace(/<[^>]+>/g, '').trim()).join("\n");
        navigator.clipboard.writeText(cleanText);
        alert("公式已复制到剪贴板！(已保留换行格式)\nFormula copied to clipboard!");
    };

    const startEditing = (index: number, skeleton: string[]) => {
        setEditingIndex(index);
        // Strip all tags (<Y>, <B>, etc.) so user sees clean text
        const cleanText = skeleton.map(line => line.replace(/<[^>]+>/g, '')).join('\n');
        setEditedSkeleton(cleanText);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditedSkeleton("");
    };

    const saveEditing = (index: number) => {
        if (!onUpdateFormula) return;
        
        const newSkeleton = editedSkeleton.split('\n').filter(l => l.trim());
        const updatedVariations = [...formula.variations];
        updatedVariations[index] = {
            ...updatedVariations[index],
            skeleton: newSkeleton,
        };

        const updatedFormula = {
            ...formula,
            variations: updatedVariations
        };

        onUpdateFormula(updatedFormula);
        setEditingIndex(null);
    };

    const handleRegenerateExample = async (index: number) => {
        if (!onUpdateFormula) return;
        setIsGeneratingExample(true);
        try {
            const currentSkeleton = editedSkeleton.split('\n').filter(l => l.trim());
            const newExample = await generateFormulaExample(currentSkeleton);
            
            const updatedVariations = [...formula.variations];
            updatedVariations[index] = {
                ...updatedVariations[index],
                skeleton: currentSkeleton,
                example: newExample
            };

            const updatedFormula = { ...formula, variations: updatedVariations };
            onUpdateFormula(updatedFormula);
            setEditingIndex(null); 
        } catch (e) {
            alert("生成失败，请重试");
        } finally {
            setIsGeneratingExample(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {formula.variations.map((variation, vIdx) => {
                const isEditing = editingIndex === vIdx;

                return (
                    <div key={vIdx} className={`bg-white border-2 rounded-3xl p-6 shadow-sm relative overflow-hidden group transition-all duration-300 ${isEditing ? 'border-duo-blue ring-4 ring-duo-blue/5 scale-[1.01] z-10' : 'border-slate-100 hover:border-slate-200'}`}>
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4 border-b border-slate-100 pb-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Lightbulb className="w-5 h-5"/>
                            </div>
                            <div className="flex-1">
                                {variation.title && (
                                    <h3 className="font-black text-lg text-slate-800 mb-1">{variation.title}</h3>
                                )}
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{formula.category}</p>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <>
                                        <button onClick={() => handleCopy(variation.skeleton)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Formula">
                                            <Copy className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => startEditing(vIdx, variation.skeleton)} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Edit Formula">
                                            <Edit3 className="w-4 h-4"/>
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={cancelEditing} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg" title="Cancel">
                                            <X className="w-4 h-4"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Note */}
                        {variation.note && !isEditing && (
                            <div className="mb-6 flex items-start gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <Info className="w-4 h-4 mt-0.5 shrink-0"/>
                                <span>{variation.note}</span>
                            </div>
                        )}

                        {/* Skeleton Formula Area */}
                        <div className="space-y-3 mb-8">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <textarea 
                                            className="w-full h-60 bg-white border-2 border-slate-200 rounded-xl p-4 font-mono text-base font-medium leading-relaxed focus:border-duo-blue focus:ring-4 focus:ring-duo-blue/10 outline-none resize-y selection:bg-duo-blue/20 text-slate-700"
                                            value={editedSkeleton}
                                            onChange={(e) => setEditedSkeleton(e.target.value)}
                                            placeholder="直接输入公式内容，每行一句..."
                                        />
                                        <div className="absolute top-2 right-2 text-[10px] text-slate-300 bg-white/80 backdrop-blur px-2 py-1 rounded select-none pointer-events-none">
                                            支持 [占位符]
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                                        <button 
                                            onClick={() => saveEditing(vIdx)}
                                            className="w-full sm:flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-slate-500/20"
                                        >
                                            <Save className="w-4 h-4"/> 保存修改 (Save)
                                        </button>
                                        <button 
                                            onClick={() => handleRegenerateExample(vIdx)}
                                            disabled={isGeneratingExample}
                                            className="w-full sm:flex-1 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold text-sm hover:bg-blue-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isGeneratingExample ? 'animate-spin' : ''}`}/> 
                                            {isGeneratingExample ? 'AI 生成中...' : '重新生成例句 (Regenerate)'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                variation.skeleton.map((line, lIdx) => (
                                    <div key={lIdx} className="text-base md:text-lg leading-relaxed font-medium text-slate-700">
                                        {renderStyledText(line)}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Example Section */}
                        {variation.example && !isEditing && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                                <div className="absolute top-0 left-0 bg-slate-200 text-slate-600 text-[10px] font-black px-3 py-1 rounded-br-xl uppercase tracking-wider">Example</div>
                                <div className="mt-4 mb-3">
                                    <p className="text-sm font-bold text-slate-500 italic mb-2">Q: {variation.example.question}</p>
                                </div>
                                <div className="space-y-3">
                                    {variation.example.answer.map((ansLine, aIdx) => (
                                        <div key={aIdx} className="text-base text-slate-800 leading-relaxed">
                                            {renderStyledText(ansLine)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default FormulaDisplay;
