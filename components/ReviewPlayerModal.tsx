
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, FastForward, Rewind, Loader2, Download, Volume2, Repeat, Repeat1, FileText } from 'lucide-react';
import { generateSpeech, createWavBlob } from '../services/geminiService';
import { exportHistoryToWord } from '../services/documentService';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';
import { UserProfile, AccentType, Session, SentenceData } from '../types';

interface ReviewItem {
    id: string;
    question: string;
    answer: string;
    topic: string;
}

interface ReviewPlayerModalProps {
    playlist: ReviewItem[];
    onClose: () => void;
    userProfile: UserProfile;
}

type PlaybackMode = 'continuous' | 'single';

const ReviewPlayerModal: React.FC<ReviewPlayerModalProps> = ({ playlist, onClose, userProfile }) => {
    // --- State ---
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playState, setPlayState] = useState<'idle' | 'question' | 'gap' | 'answer'>('idle');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    
    // Settings
    const [mode, setMode] = useState<PlaybackMode>('continuous');
    const [loopCount, setLoopCount] = useState<number>(1); 
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(userProfile.playbackSpeed || 1.0);

    // Refs for playback logic
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playSessionRef = useRef<number>(0);
    const currentLoopRef = useRef(0);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (itemRefs.current[currentIndex]) {
            itemRefs.current[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentIndex]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    useEffect(() => {
        return () => stopAll();
    }, []);

    const stopAll = () => {
        playSessionRef.current++; 
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        setIsPlaying(false);
        setPlayState('idle');
        setIsLoadingAudio(false);
    };

    const getVoice = (isQuestion: boolean) => {
        if (isQuestion) {
            const pool = userProfile.preferredAccent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET;
            const other = pool.filter(v => v.id !== userProfile.preferredVoiceId);
            return (other[0] || pool[0]).geminiVoiceName || 'Zephyr';
        }
        const all = [...VOICES_US_PRESET, ...VOICES_UK_PRESET];
        return all.find(v => v.id === userProfile.preferredVoiceId)?.geminiVoiceName || 'Zephyr';
    };

    // ... (keep audio playing logic same as before, simplified for brevity here)
    const playItemSequence = async (index: number) => {
        const sessionId = playSessionRef.current;
        const item = playlist[index];
        if (!item) return;

        try {
            setIsLoadingAudio(true);
            setPlayState('question');
            
            const qPcm = await generateSpeech(item.question, getVoice(true));
            if (sessionId !== playSessionRef.current) return;
            const qUrl = URL.createObjectURL(createWavBlob(qPcm));
            
            const qAudio = new Audio(qUrl);
            qAudio.playbackRate = 1.1; 
            qAudio.preservesPitch = true;
            audioRef.current = qAudio;
            setIsLoadingAudio(false);
            
            await new Promise<void>((resolve) => {
                qAudio.onended = () => { URL.revokeObjectURL(qUrl); resolve(); };
                qAudio.play();
            });
            if (sessionId !== playSessionRef.current) return;

            setPlayState('gap');
            await new Promise(r => setTimeout(r, 800));
            if (sessionId !== playSessionRef.current) return;

            setPlayState('answer');
            setIsLoadingAudio(true);
            const aPcm = await generateSpeech(item.answer, getVoice(false));
            if (sessionId !== playSessionRef.current) return;
            const aUrl = URL.createObjectURL(createWavBlob(aPcm));
            
            const aAudio = new Audio(aUrl);
            aAudio.playbackRate = playbackSpeed; 
            aAudio.preservesPitch = true;
            audioRef.current = aAudio;
            setIsLoadingAudio(false);

            await new Promise<void>((resolve) => {
                aAudio.onended = () => { URL.revokeObjectURL(aUrl); resolve(); };
                aAudio.play();
            });
            if (sessionId !== playSessionRef.current) return;

            setPlayState('idle');
            await new Promise(r => setTimeout(r, 500));

            if (mode === 'single') {
                currentLoopRef.current += 1;
                if (loopCount === 999 || currentLoopRef.current < loopCount) {
                    playItemSequence(index); 
                } else {
                    setIsPlaying(false);
                }
            } else {
                const nextIdx = index + 1;
                if (nextIdx < playlist.length) {
                    setCurrentIndex(nextIdx);
                    playItemSequence(nextIdx);
                } else {
                    setIsPlaying(false);
                }
            }

        } catch (e) {
            if (sessionId === playSessionRef.current) {
                setIsPlaying(false);
                setIsLoadingAudio(false);
            }
        }
    };

    const startPlayback = (index: number) => {
        stopAll();
        playSessionRef.current++;
        setIsPlaying(true);
        setCurrentIndex(index);
        currentLoopRef.current = 0;
        playItemSequence(index);
    };

    const togglePlay = () => {
        if (isPlaying) {
            stopAll();
        } else {
            startPlayback(currentIndex);
        }
    };

    const skip = (direction: 'next' | 'prev') => {
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= playlist.length) newIndex = playlist.length - 1;
        startPlayback(newIndex);
    };

    const handleDownloadAudio = async () => {
        stopAll();
        setIsDownloading(true);
        try {
            const buffers: ArrayBuffer[] = [];
            const silenceBuffer = new Uint8Array(24000 * 2); // 1s

            for (const item of playlist) {
                const qPcm = await generateSpeech(item.question, getVoice(true));
                if (qPcm.byteLength > 0) buffers.push(qPcm);
                buffers.push(silenceBuffer.slice(0, 12000).buffer); 
                const aPcm = await generateSpeech(item.answer, getVoice(false));
                if (aPcm.byteLength > 0) buffers.push(aPcm);
                buffers.push(silenceBuffer.buffer); 
            }

            const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const b of buffers) {
                combined.set(new Uint8Array(b), offset);
                offset += b.byteLength;
            }

            const wavBlob = createWavBlob(combined.buffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Ieltsformula_Review.wav`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            alert("Download failed.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadWord = async () => {
        // Convert playlist back to Session format for export
        const tempSession: Session = {
            id: 'export',
            timestamp: Date.now(),
            topicLabel: 'Review Playlist',
            sentences: playlist.map(p => ({
                type: 'Review',
                question: p.question,
                content: p.answer,
                questionPart: 'Part 1',
                draftInput: ''
            })),
            userAudios: []
        };
        await exportHistoryToWord([tempSession]);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-md flex flex-col animate-fade-in text-white font-sans">
            
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 md:p-6 bg-white/5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black font-black shadow-lg shadow-green-500/20">
                        {isPlaying ? <Volume2 className="w-5 h-5"/> : <Play className="w-5 h-5 ml-0.5 fill-current"/>}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white leading-none mb-1">Review Queue</h2>
                        <div className="flex items-center gap-2 text-xs text-white/50 font-bold">
                            <span>{currentIndex + 1} / {playlist.length}</span>
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            <span className="text-green-400">{mode === 'single' ? 'Single Loop' : 'Continuous'}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadWord} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Export Word">
                        <FileText className="w-5 h-5"/>
                    </button>
                    <button onClick={handleDownloadAudio} disabled={isDownloading} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50" title="Export Audio">
                        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                    </button>
                    <button onClick={onClose} className="p-3 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative custom-scrollbar">
                {playlist.map((item, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                        <div 
                            key={idx} 
                            ref={el => itemRefs.current[idx] = el}
                            onClick={() => startPlayback(idx)}
                            className={`p-6 rounded-3xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden group
                                ${isActive 
                                    ? 'bg-white/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)] opacity-100 scale-[1.01]' 
                                    : 'bg-transparent border-white/5 opacity-40 hover:opacity-70 hover:border-white/20'}
                            `}
                        >
                            <div className="flex gap-2 mb-3">
                                <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white/60">{item.topic}</span>
                                {isActive && isLoadingAudio && (
                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin"/> Loading Audio...
                                    </span>
                                )}
                                {isActive && playState === 'gap' && (
                                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-[10px] font-bold animate-pulse">Waiting...</span>
                                )}
                            </div>

                            <h3 className={`text-lg font-bold mb-3 leading-tight transition-colors ${isActive && playState === 'question' ? 'text-green-400' : 'text-white/90'}`}>
                                {item.question}
                            </h3>
                            <p className={`text-base leading-relaxed transition-colors ${isActive && playState === 'answer' ? 'text-white' : 'text-white/60'}`}>
                                {item.answer}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            <div className="p-6 bg-white/5 border-t border-white/10 flex flex-col gap-6 shrink-0 backdrop-blur-xl">
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex bg-black/40 p-1 rounded-xl">
                        <button 
                            onClick={() => { setMode('single'); stopAll(); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'single' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <Repeat1 className="w-3.5 h-3.5"/> 单句模式
                        </button>
                        <button 
                            onClick={() => { setMode('continuous'); stopAll(); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'continuous' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <Repeat className="w-3.5 h-3.5"/> 连续模式
                        </button>
                    </div>

                    {mode === 'single' && (
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Loops</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 5, 999].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setLoopCount(num)}
                                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all
                                            ${loopCount === num ? 'bg-green-500 text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}
                                        `}
                                    >
                                        {num === 999 ? '∞' : num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl flex-1 max-w-[200px]">
                        <span className="text-[10px] font-bold text-white/60">Speed</span>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.25" 
                            value={playbackSpeed} 
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} 
                            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                        <span className="text-[10px] font-mono text-white min-w-[24px] text-right">{playbackSpeed}x</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-8 pb-2">
                    <button 
                        onClick={() => skip('prev')}
                        className="p-4 text-white/30 hover:text-white transition-colors hover:scale-110 active:scale-95"
                    >
                        <Rewind className="w-8 h-8"/>
                    </button>

                    <button 
                        onClick={togglePlay}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 border-4
                            ${isPlaying ? 'bg-white text-black border-white' : 'bg-green-500 text-white border-green-500 shadow-green-500/40'}
                        `}
                    >
                        {isPlaying ? <Pause className="w-8 h-8 fill-current"/> : <Play className="w-8 h-8 ml-1 fill-current"/>}
                    </button>

                    <button 
                        onClick={() => skip('next')}
                        className="p-4 text-white/30 hover:text-white transition-colors hover:scale-110 active:scale-95"
                    >
                        <FastForward className="w-8 h-8"/>
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ReviewPlayerModal;
