
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Plus, Trash2, Play, Pause, Headphones, Map, List, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { ListeningEntry, ListeningQuestionType } from '../types';
import { analyzeListeningInput, generateSpeech, createWavBlob, pcmToAudioBuffer } from '../services/geminiService';

interface ListeningNotebookModalProps {
    onClose: () => void;
    history: ListeningEntry[];
    setHistory: React.Dispatch<React.SetStateAction<ListeningEntry[]>>;
}

const ListeningNotebookModal: React.FC<ListeningNotebookModalProps> = ({ onClose, history, setHistory }) => {
    const [view, setView] = useState<'list' | 'import' | 'detail'>('list');
    const [inputText, setInputText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeEntry, setActiveEntry] = useState<ListeningEntry | null>(null);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    // Stop audio on unmount or close
    useEffect(() => {
        return () => stopAudio();
    }, []);

    const stopAudio = () => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch(e) {}
            sourceNodeRef.current = null;
        }
        setIsPlaying(false);
        setIsLoadingAudio(false);
    };

    const handleImport = async () => {
        if (!inputText.trim()) return;
        setIsAnalyzing(true);
        try {
            const entry = await analyzeListeningInput(inputText);
            setHistory(prev => [entry, ...prev]);
            setActiveEntry(entry);
            setView('detail');
            setInputText("");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Delete this listening entry?")) {
            setHistory(prev => prev.filter(h => h.id !== id));
            if (activeEntry?.id === id) {
                setActiveEntry(null);
                setView('list');
            }
        }
    };

    const playEntryAudio = async (entry: ListeningEntry) => {
        if (isPlaying && activeEntry?.id === entry.id) {
            stopAudio();
            return;
        }
        stopAudio();
        
        setIsLoadingAudio(true);
        setActiveEntry(entry); // Ensure visual context matches audio

        try {
            // Use British Voice for Authenticity (Fenrir is narrative/deep British-ish, Puck is clear British)
            const pcmBuffer = await generateSpeech(entry.originalText, 'Puck');
            
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioBuffer = pcmToAudioBuffer(pcmBuffer, audioContextRef.current);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            
            sourceNodeRef.current = source;
            source.start();
            setIsPlaying(true);
        } catch (e) {
            console.error(e);
            alert("Audio playback failed.");
        } finally {
            setIsLoadingAudio(false);
        }
    };

    // --- RENDERERS ---

    const renderTaggedContent = (content: string, type: string) => {
        // Regex to split by tags: [TAG]content[/TAG]
        // We capture the tag name and the content
        const regex = /\[(LOC|ANS|KEY|DIR|STR|WK)\](.*?)\[\/\1\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(content)) !== null) {
            // Push text before the match
            if (match.index > lastIndex) {
                parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
            }

            const tag = match[1];
            const text = match[2];
            
            // Logic for specific tags based on Question Type context if needed, 
            // but styling is mostly universal.
            let className = "";
            let toolTip = "";

            switch (tag) {
                case 'LOC': // Locator (Blue)
                    className = "text-blue-600 bg-blue-50 border-b-2 border-blue-200 font-bold px-0.5 mx-0.5 rounded";
                    toolTip = "定位词 (Locator)";
                    break;
                case 'ANS': // Answer (Green)
                    className = "text-green-700 bg-green-100 border-2 border-green-300 font-black px-1.5 mx-0.5 rounded shadow-sm";
                    toolTip = "答案 (Answer)";
                    break;
                case 'KEY': // Keyword/Distractor (Orange)
                    className = "text-orange-600 bg-orange-50 border-b-2 border-orange-200 font-medium px-0.5 mx-0.5 rounded italic";
                    toolTip = "考点/逻辑词";
                    break;
                case 'DIR': // Direction (Purple - Map)
                    className = "text-purple-600 bg-purple-50 font-bold px-1 mx-0.5 rounded border border-purple-200";
                    toolTip = "方位词";
                    break;
                case 'STR': // Stress (Bold + Red dot)
                    className = "font-black text-gray-900 relative inline-block";
                    // Add a pseudo-element like styling via separate span or class if needed
                    break;
                case 'WK': // Weak (Gray/Light)
                    className = "text-gray-400 font-light opacity-80 text-sm";
                    break;
            }

            parts.push(
                <span key={match.index} className={className} title={toolTip}>
                    {text}
                    {tag === 'STR' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></span>}
                </span>
            );

            lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < content.length) {
            parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
        }

        return <div className="leading-loose text-lg text-gray-700">{parts}</div>;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-bg-card w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-border">
                
                {/* Header */}
                <div className="bg-bg-input p-6 border-b border-border flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-duo-purple/10 rounded-xl"><Headphones className="w-6 h-6 text-duo-purple"/></div>
                        <div>
                            <h2 className="text-xl font-black text-fg-main">Listening Notebook</h2>
                            <p className="text-xs text-fg-muted font-bold">IELTS 真题精听与错题分析</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         {view !== 'list' && (
                             <button onClick={() => { setView('list'); stopAudio(); }} className="px-4 py-2 bg-bg-card hover:bg-bg-hover text-fg-muted rounded-xl text-xs font-bold transition-colors border border-border">Back to List</button>
                         )}
                         <button onClick={onClose} className="p-2 hover:bg-bg-hover rounded-full text-fg-muted transition-colors"><X className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-bg-main">
                    
                    {/* VIEW: LIST */}
                    {view === 'list' && (
                        <div className="flex-1 flex flex-col p-6">
                            <button 
                                onClick={() => setView('import')} 
                                className="w-full py-6 border-2 border-dashed border-border rounded-3xl text-fg-muted hover:text-duo-purple hover:border-duo-purple/50 hover:bg-duo-purple/5 transition-all flex flex-col items-center justify-center gap-2 mb-6 group shrink-0"
                            >
                                <div className="p-3 bg-bg-input rounded-full group-hover:scale-110 transition-transform"><Plus className="w-6 h-6"/></div>
                                <span className="font-bold text-sm">Import New Transcript</span>
                            </button>

                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                {history.length === 0 && (
                                    <div className="text-center text-fg-muted py-10 text-sm font-medium">No listening entries yet.</div>
                                )}
                                {history.map(item => (
                                    <div key={item.id} onClick={() => { setActiveEntry(item); setView('detail'); }} className="bg-bg-card p-5 rounded-2xl border border-border hover:border-duo-purple/30 hover:shadow-md transition-all cursor-pointer group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-bg-input px-2 py-1 rounded-lg text-fg-sub">{item.questionType.split('(')[0]}</span>
                                            <span className="text-[10px] font-bold text-fg-muted">{new Date(item.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-base font-bold text-fg-main mb-2 truncate">{item.sourceTitle}</h3>
                                        <p className="text-xs text-fg-muted line-clamp-2">{item.summary || item.originalText.slice(0, 100)}...</p>
                                        <button onClick={(e) => handleDelete(item.id, e)} className="absolute right-4 bottom-4 p-2 text-fg-sub hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VIEW: IMPORT */}
                    {view === 'import' && (
                        <div className="flex-1 p-6 flex flex-col max-w-2xl mx-auto w-full">
                            <h3 className="text-lg font-bold text-fg-main mb-4 flex items-center gap-2">
                                <List className="w-5 h-5 text-duo-blue"/> Paste Transcript
                            </h3>
                            <div className="flex-1 relative mb-6">
                                <textarea 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Paste raw text here... (e.g., 'Cambridge 14 Test 2 Part 3...')"
                                    className="w-full h-full bg-bg-input border-2 border-border rounded-2xl p-4 text-sm resize-none focus:ring-4 focus:ring-duo-purple/10 focus:border-duo-purple outline-none transition-all"
                                />
                                <div className="absolute bottom-4 right-4 text-[10px] text-fg-sub font-bold bg-bg-card px-2 py-1 rounded border border-border">
                                    Supports: Cam 4-19
                                </div>
                            </div>
                            <button 
                                onClick={handleImport} 
                                disabled={isAnalyzing || !inputText.trim()}
                                className="w-full py-4 bg-duo-purple hover:bg-purple-600 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowRight className="w-5 h-5"/>}
                                {isAnalyzing ? 'Analyzing Type & Completing Text...' : 'Analyze & Import'}
                            </button>
                        </div>
                    )}

                    {/* VIEW: DETAIL */}
                    {view === 'detail' && activeEntry && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Toolbar */}
                            <div className="bg-bg-card border-b border-border p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                                <div>
                                    <h3 className="font-black text-lg text-fg-main">{activeEntry.sourceTitle}</h3>
                                    <div className="flex items-center gap-2 text-xs font-bold text-fg-muted mt-1">
                                        <span className="bg-duo-purple/10 text-duo-purple px-2 py-0.5 rounded">{activeEntry.questionType.split('(')[0]}</span>
                                        <span>• {new Date(activeEntry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => playEntryAudio(activeEntry)}
                                    className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg
                                        ${isPlaying 
                                            ? 'bg-duo-purple text-white hover:bg-purple-600 shadow-purple-500/30' 
                                            : 'bg-white text-fg-main hover:bg-gray-50 border border-border'
                                        }`}
                                >
                                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin"/> : isPlaying ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current"/>}
                                    {isLoadingAudio ? 'Loading...' : isPlaying ? 'Pause' : 'Play Original (AI)'}
                                </button>
                            </div>

                            {/* Text Area */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    
                                    {/* Legend */}
                                    <div className="flex flex-wrap gap-4 text-[10px] font-bold text-fg-muted select-none bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Locator</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Keyword/Logic</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Answer</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-900"></span> Strong Stress</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Weak Form</span>
                                    </div>

                                    {/* Content */}
                                    <div className="prose prose-lg max-w-none">
                                        {renderTaggedContent(activeEntry.analyzedContent, activeEntry.questionType)}
                                    </div>

                                    {/* Summary */}
                                    {activeEntry.summary && (
                                        <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Summary</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed italic">{activeEntry.summary}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ListeningNotebookModal;
