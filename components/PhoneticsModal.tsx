
import React, { useState, useEffect } from 'react';
import { X, Volume2, BookOpen } from 'lucide-react';
import { PHONETICS_DATA, PhoneticSymbol } from '../data/phoneticsData';

interface PhoneticsModalProps {
    onClose: () => void;
}

// Improved Classification Logic
type MouthType = 
    | 'spread'      // i:, ɪ, e, ei (Smile)
    | 'neutral'     // ə, 3: (Relaxed)
    | 'open'        // ɑ:, ɒ, ae (Jaw down)
    | 'rounded'     // u:, ɔ: (O shape)
    | 'bilabial'    // p, b, m, w (Lips closed/narrow)
    | 'labiodental' // f, v (Top teeth on bottom lip)
    | 'dental'      // θ, ð (Tongue between teeth)
    | 'alveolar'    // t, d, s, z, n, l (Tongue on ridge)
    | 'palatal'     // ʃ, ʒ, tʃ, dʒ, j (Tongue roof)
    | 'velar'       // k, g, ŋ (Back of throat)
    | 'glottal';    // h (Open throat)

const getMouthShape = (symbol: string): MouthType => {
    // Vowels
    if (['i:', 'ɪ', 'e', 'eɪ', 'aɪ', 'ɔɪ'].includes(symbol)) return 'spread';
    if (['ɑ:', 'ɒ', 'ʌ', 'aʊ', 'æ'].includes(symbol)) return 'open';
    if (['ɔ:', 'ʊ', 'u:', 'əʊ', 'ʊə'].includes(symbol)) return 'rounded';
    if (['3:', 'ə', 'ɪə', 'eə'].includes(symbol)) return 'neutral';

    // Consonants
    if (['p', 'b', 'm', 'w'].includes(symbol)) return 'bilabial';
    if (['f', 'v'].includes(symbol)) return 'labiodental';
    if (['θ', 'ð'].includes(symbol)) return 'dental';
    if (['t', 'd', 's', 'z', 'n', 'l'].includes(symbol)) return 'alveolar';
    if (['ʃ', 'ʒ', 'tʃ', 'dʒ', 'j', 'r'].includes(symbol)) return 'palatal';
    if (['k', 'g', 'ŋ'].includes(symbol)) return 'velar';
    if (['h'].includes(symbol)) return 'glottal';

    return 'neutral';
};

const MouthVisual: React.FC<{ type: MouthType, isPlaying: boolean }> = ({ type, isPlaying }) => {
    const color = isPlaying ? "#58CC02" : "#CBD5E1"; 
    const transition = "all 0.3s ease-in-out";

    // SVG Path Generators
    let lipsPath = "";
    let teethPath = "";
    let tonguePath = "";

    switch (type) {
        case 'spread': // Smile
            lipsPath = "M10,25 Q30,40 50,25 Q30,15 10,25 Z"; 
            break;
        case 'open': // Big O
            lipsPath = "M20,10 Q50,10 50,30 Q50,50 30,50 Q10,50 10,30 Q10,10 20,10 Z";
            break;
        case 'rounded': // Small Circle
            lipsPath = "M30,20 Q40,20 40,30 Q40,40 30,40 Q20,40 20,30 Q20,20 30,20 Z";
            break;
        case 'neutral': // Relaxed
            lipsPath = "M15,25 Q30,30 45,25 Q30,20 15,25 Z";
            break;
        
        // --- Consonants ---
        case 'bilabial': // Line (Closed) - p, b, m
            lipsPath = "M10,30 Q30,30 50,30"; 
            break;
        case 'labiodental': // Teeth on lip - f, v
            lipsPath = "M15,35 Q30,40 45,35"; // Bottom lip
            teethPath = "M20,30 H40"; // Top teeth line
            break;
        case 'dental': // Tongue sticking out - th
            lipsPath = "M15,25 Q30,15 45,25 M15,35 Q30,45 45,35"; // Open lips
            tonguePath = "M25,30 H35"; // Tongue tip
            break;
        case 'alveolar': // Slight open, teeth together - t, d, s
            lipsPath = "M15,25 Q30,30 45,25 Q30,20 15,25 Z"; // Neutral open
            teethPath = "M20,25 H40"; // Teeth close together
            break;
        default:
            lipsPath = "M15,25 Q30,30 45,25 Q30,20 15,25 Z";
    }

    return (
        <div className={`w-12 h-10 flex items-center justify-center transition-transform ${isPlaying ? 'scale-110' : 'scale-100'}`}>
            <svg width="100%" height="100%" viewBox="0 0 60 60" className="overflow-visible">
                {/* Tongue (Layer 1) */}
                {tonguePath && <path d={tonguePath} stroke="#FCA5A5" strokeWidth="4" strokeLinecap="round" />}
                
                {/* Teeth (Layer 2) */}
                {teethPath && <path d={teethPath} stroke="white" strokeWidth="4" strokeLinecap="round" />}
                
                {/* Lips (Layer 3) */}
                <path 
                    d={lipsPath} 
                    fill={type === 'bilabial' || type === 'labiodental' ? 'none' : (isPlaying ? color : 'none')} 
                    stroke={color} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    style={{ transition }}
                    className={isPlaying ? "animate-pulse" : ""}
                />
            </svg>
        </div>
    );
};

const PhoneticsModal: React.FC<PhoneticsModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'vowels' | 'consonants'>('vowels');
    const [playingSymbol, setPlayingSymbol] = useState<string | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => { const vs = window.speechSynthesis.getVoices(); setVoices(vs); };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) { window.speechSynthesis.onvoiceschanged = loadVoices; }
    }, []);

    const filteredData = PHONETICS_DATA.filter(item => {
        if (activeTab === 'vowels') return item.type === 'vowel' || item.type === 'diphthong';
        return item.type === 'consonant';
    });

    const playSound = (item: PhoneticSymbol) => {
        if (playingSymbol) return;
        setPlayingSymbol(item.symbol);
        window.speechSynthesis.cancel();
        // Uses browser native text-to-speech (Offline where supported)
        const utterance = new SpeechSynthesisUtterance(`${item.word}. ${item.example}`);
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang.startsWith('en-'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.8; 
        utterance.volume = 1;
        utterance.onend = () => setPlayingSymbol(null);
        utterance.onerror = () => setPlayingSymbol(null);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col border-2 border-[#E5E5E5] overflow-hidden relative">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#E5E5E5] bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-duo-blue flex items-center justify-center text-white border-b-4 border-duo-blueDark">
                            <span className="text-xl font-serif font-black">æ</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-700 tracking-tight">音标发音 (Phonetics)</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-6 h-6 stroke-[3]"/></button>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 py-6 bg-slate-50 border-b-2 border-[#E5E5E5] shrink-0">
                    <button onClick={() => setActiveTab('vowels')} className={`px-8 py-3 rounded-2xl font-black text-sm tracking-wide border-b-4 transition-all active:border-b-0 active:translate-y-1 ${activeTab === 'vowels' ? 'bg-duo-blue border-duo-blueDark text-white shadow-lg shadow-blue-200' : 'bg-white border-[#E5E5E5] text-slate-500 hover:bg-slate-100'}`}>元音 (Vowels)</button>
                    <button onClick={() => setActiveTab('consonants')} className={`px-8 py-3 rounded-2xl font-black text-sm tracking-wide border-b-4 transition-all active:border-b-0 active:translate-y-1 ${activeTab === 'consonants' ? 'bg-duo-blue border-duo-blueDark text-white shadow-lg shadow-blue-200' : 'bg-white border-[#E5E5E5] text-slate-500 hover:bg-slate-100'}`}>辅音 (Consonants)</button>
                </div>

                {/* Legend - Improved Classifications */}
                <div className="px-6 pt-4 pb-2 bg-slate-50 flex flex-wrap justify-center gap-4 border-b border-[#E5E5E5]">
                    {activeTab === 'consonants' ? (
                        <>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><span className="w-4 border-b-2 border-slate-400 block"></span> 双唇音 (Lips)</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><span className="w-2 h-2 border border-slate-400 block"></span> 咬唇音 (Lip-Teeth)</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><span className="w-2 h-1 bg-red-200 block"></span> 咬舌音 (Tongue Out)</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm">爆破/摩擦 (Plosive/Fricative)</div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><div className="w-4 h-2 rounded-full border border-slate-400"></div> 扁平 (Smile)</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><div className="w-3 h-3 rounded-full border border-slate-400"></div> 圆唇 (O-Shape)</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-white px-2 py-1 rounded border shadow-sm"><div className="w-3 h-4 rounded-full border border-slate-400"></div> 开口 (Jaw Down)</div>
                        </>
                    )}
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    <div className="max-w-3xl mx-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredData.map((item, idx) => {
                                const isPlaying = playingSymbol === item.symbol;
                                const mouthShape = getMouthShape(item.symbol);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => playSound(item)}
                                        disabled={!!playingSymbol}
                                        className={`relative group flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-[#E5E5E5] border-b-4 transition-all active:border-b-2 active:translate-y-[2px] hover:bg-slate-50
                                            ${isPlaying ? 'border-duo-blue bg-blue-50' : 'bg-white'}
                                        `}
                                    >
                                        <div className="mb-3 h-10 flex items-center justify-center">
                                            <MouthVisual type={mouthShape} isPlaying={isPlaying} />
                                        </div>
                                        <div className={`text-3xl font-black mb-1 font-serif transition-colors ${isPlaying ? 'text-duo-blue' : 'text-slate-700'}`}>/{item.symbol}/</div>
                                        <div className="text-sm font-bold text-slate-400 group-hover:text-slate-500">{item.word}</div>
                                        {isPlaying && <div className="absolute top-2 right-2 text-duo-blue animate-pulse"><Volume2 className="w-4 h-4"/></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhoneticsModal;
