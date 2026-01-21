
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Video, Loader2, Play, Square, Award, Download, Clock, User, ChevronRight, Volume2, Command, Maximize2, Minimize2, MonitorPlay, Check, ArrowRight, Zap } from 'lucide-react';
import { ExamStage, ExamMessage, ExamReport, UserProfile } from '../types';
import { generateSpeech, generateExamReport, createWavBlob, pcmToAudioBuffer } from '../services/geminiService';
import { IELTS_Part1_Topics, IELTS_Part2_Topics, IELTS_Part3_Topics } from '../data/ieltsData';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';
import { GoogleGenAI } from '@google/genai';

// Polyfill for SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface MockExamModalProps {
    onClose: () => void;
    userProfile: UserProfile;
}

interface ScriptItem {
    stage: ExamStage;
    text: string;
    audioBuffer?: AudioBuffer;
    part2Topic?: string;
}

const MockExamModal: React.FC<MockExamModalProps> = ({ onClose, userProfile }) => {
    const [stage, setStage] = useState<ExamStage | 'loading'>('loading');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [script, setScript] = useState<ScriptItem[]>([]);
    const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
    
    const [transcript, setTranscript] = useState<ExamMessage[]>([]);
    const [currentExaminerText, setCurrentExaminerText] = useState("");
    const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [timer, setTimer] = useState(0);
    const [part2Topic, setPart2Topic] = useState("");
    const [report, setReport] = useState<ExamReport | null>(null);
    const [snapshots, setSnapshots] = useState<string[]>([]);
    const [permissionError, setPermissionError] = useState(false);
    
    // UI State
    const [videoSize, setVideoSize] = useState<'small' | 'large'>('small');

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const turnRecorderRef = useRef<MediaRecorder | null>(null);
    const turnChunksRef = useRef<BlobPart[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const recognitionRef = useRef<any>(null); 
    const silenceTimerRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Init Audio Context & Preload
    useEffect(() => {
        const initAndPreload = async () => {
            // 1. Init AudioContext
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
            
            // 2. Generate Exam Script & Preload Audio
            await generateFullExamScript();
        };
        initAndPreload();

        return () => stopAllMedia();
    }, []);

    // Camera Logic
    useEffect(() => {
        if (stage !== 'loading' && stage !== 'setup' && stage !== 'report' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [stage, videoSize]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (stage === 'part2_prep' || stage === 'part2_speak') {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 0) {
                        handleTimerEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [stage]);

    // Silence Detection & Snapshots
    useEffect(() => {
        let snapshotInterval: any;
        let silenceCheckInterval: any;

        if (stage === 'part1' || stage === 'part2_speak' || stage === 'part3') {
            snapshotInterval = setInterval(takeSnapshot, 15000); 
        }

        if (isUserSpeaking) {
             silenceCheckInterval = setInterval(checkSilence, 100);
        }

        return () => {
            clearInterval(snapshotInterval);
            clearInterval(silenceCheckInterval);
        };
    }, [stage, isUserSpeaking]);

    // Voice Commands
    useEffect(() => {
        if (isUserSpeaking && SpeechRecognition && !isProcessing) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const transcriptText = event.results[i][0].transcript.toLowerCase().trim();
                        if (transcriptText.includes("next question") || transcriptText.includes("that's it") || transcriptText.includes("finished")) {
                            stopUserRecording(); 
                            recognition.stop();
                        }
                    }
                }
            };
            try { recognition.start(); recognitionRef.current = recognition; } catch (e) {}
        } else {
            if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
        }
    }, [isUserSpeaking, isProcessing]);

    const getExaminerVoiceName = () => {
        const allVoices = [...VOICES_US_PRESET, ...VOICES_UK_PRESET];
        const selected = allVoices.find(v => v.id === userProfile.preferredVoiceId);
        return selected?.geminiVoiceName || 'Zephyr';
    };

    const generateFullExamScript = async () => {
        setLoadingProgress(10);
        const p1Topic = IELTS_Part1_Topics[Math.floor(Math.random() * IELTS_Part1_Topics.length)];
        const p2Topic = IELTS_Part2_Topics[Math.floor(Math.random() * IELTS_Part2_Topics.length)];
        const p3Topic = IELTS_Part3_Topics[Math.floor(Math.random() * IELTS_Part3_Topics.length)];
        
        // Construct a linear script
        const rawScript: ScriptItem[] = [
            { stage: 'intro', text: "Hello. This is the speaking section of the IELTS exam. I will be your examiner today. Can you tell me your full name?" },
            { stage: 'part1', text: `Thank you. Now, in this first part, I'd like to ask you some questions about yourself. Let's talk about: ${p1Topic.split(':')[0]}. ${p1Topic.split(':')[1]}` },
            { stage: 'part1', text: "Do you think this is popular among people in your country?" },
            { stage: 'part1', text: "Is there anything you would like to change about this in the future?" },
            { stage: 'part2_intro', text: `Thank you. Now let's move on to Part 2. I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. You have one minute to think about what you're going to say. Here is your topic.` },
             // Implicit state change to part2_prep happens here in logic, no audio needed for prep
            { stage: 'part2_speak', text: "Alright, remember you have one to two minutes for this. Don't worry if I stop you. Please start speaking now.", part2Topic: p2Topic },
            { stage: 'part3', text: `Thank you. We've been talking about ${p2Topic.split('Describe')[1] || 'a topic'}. Now I'd like to discuss one or two more general questions related to this. ${p3Topic}` },
            { stage: 'part3', text: "Do you think opinions on this have changed compared to the past?" },
            { stage: 'part3', text: "How do you think this might develop in the future?" },
            { stage: 'concluded', text: "Thank you. That is the end of the speaking test." }
        ];

        setLoadingProgress(30);
        const voiceName = getExaminerVoiceName();
        const ctx = audioContextRef.current!;

        // Parallel fetch all audio
        const totalItems = rawScript.length;
        let completed = 0;

        const enrichedScript = await Promise.all(rawScript.map(async (item) => {
            try {
                // Generate simple PCM
                const pcm = await generateSpeech(item.text, voiceName);
                // Convert to AudioBuffer
                const buffer = pcmToAudioBuffer(pcm, ctx);
                
                completed++;
                setLoadingProgress(30 + Math.floor((completed / totalItems) * 70));
                
                return { ...item, audioBuffer: buffer };
            } catch (e) {
                console.error("Failed to preload audio line", e);
                return item;
            }
        }));

        setScript(enrichedScript);
        setPart2Topic(p2Topic);
        setStage('setup');
    };

    const stopAllMedia = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (turnRecorderRef.current) turnRecorderRef.current.stop();
        if (recognitionRef.current) recognitionRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
    };

    const checkSilence = () => {
        if (!analyserRef.current || !isUserSpeaking) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        // Threshold for silence (adjustable)
        if (average < 10) { 
            silenceTimerRef.current += 100; // +100ms
        } else {
            silenceTimerRef.current = 0; // Reset if noise detected
        }

        // Trigger stop if 3s silence
        if (silenceTimerRef.current > 3000) {
            console.log("Auto-submitting due to silence...");
            stopUserRecording();
            silenceTimerRef.current = 0;
        }
    };

    const handleStartExam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            
            // Set up Audio Context for Silence Detection
            if (audioContextRef.current) {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;
            }

            // Resume context if needed
            if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

            setCurrentScriptIndex(0);
            playNextScriptItem(0); // Play Intro
        } catch (e) {
            console.error(e);
            setPermissionError(true);
        }
    };

    const playNextScriptItem = async (index: number) => {
        if (index >= script.length) return;
        
        const item = script[index];
        setStage(item.stage);
        
        // Update UI Text
        setIsExaminerSpeaking(true);
        setCurrentExaminerText(item.text);
        setTranscript(prev => [...prev, { role: 'examiner', text: item.text }]);

        if (item.audioBuffer && audioContextRef.current) {
            const source = audioContextRef.current.createBufferSource();
            source.buffer = item.audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => {
                setIsExaminerSpeaking(false);
                
                // Logic after audio ends
                if (item.stage === 'part2_intro') {
                     // Start Prep Timer
                     setStage('part2_prep');
                     setTimer(60);
                     // Advance index but wait for timer
                     setCurrentScriptIndex(index + 1);
                } else if (item.stage === 'concluded') {
                    finishExam();
                } else if (item.stage !== 'part2_prep') {
                     // Default: User turn
                     startUserRecording();
                }
            };
            source.start();
        } else {
            // Fallback if no audio
            setTimeout(() => {
                setIsExaminerSpeaking(false);
                if (item.stage !== 'concluded') startUserRecording();
            }, 3000);
        }
    };

    const advanceToNextStep = () => {
        const nextIndex = currentScriptIndex + 1;
        setCurrentScriptIndex(nextIndex);
        playNextScriptItem(nextIndex);
    };

    const takeSnapshot = () => {
        if (!videoRef.current) return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth / 5; 
            canvas.height = videoRef.current.videoHeight / 5;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            setSnapshots(prev => [...prev, base64]);
        } catch(e) {}
    };

    const handleTimerEnd = () => {
        if (stage === 'part2_prep') {
            // Timer done, play "Alright, remember..." (which is at currentScriptIndex now)
            playNextScriptItem(currentScriptIndex); 
            // Note: playNextScriptItem will play audio then start recording.
            setTimer(120); 
        } else if (stage === 'part2_speak') {
             stopUserRecording(); // Auto stop after 2 mins speaking
        }
    };

    const startUserRecording = () => {
        if (streamRef.current && !isProcessing) {
             const recorder = new MediaRecorder(streamRef.current);
             turnRecorderRef.current = recorder;
             turnChunksRef.current = [];
             recorder.ondataavailable = (e) => { if (e.data.size > 0) turnChunksRef.current.push(e.data); };
             recorder.start();
             setIsUserSpeaking(true);
             silenceTimerRef.current = 0; // Reset silence timer
        }
    };

    const stopUserRecording = () => {
        if (turnRecorderRef.current && turnRecorderRef.current.state !== 'inactive') {
            setIsUserSpeaking(false);
            setIsProcessing(true); // "Thinking..." UI
            
            turnRecorderRef.current.stop();
            turnRecorderRef.current.onstop = async () => {
                 // We don't actually process the audio for logic anymore (Linear Script),
                 // but we simulate the "Processing" delay slightly for realism if needed, 
                 // or just go instant for "Zero Latency".
                 // We still add the placeholder to transcript.
                 setTranscript(prev => [...prev, { role: 'candidate', text: "(Audio Answer)" }]);
                 
                 setTimeout(() => {
                     setIsProcessing(false);
                     advanceToNextStep();
                 }, 800); // 800ms fake thinking for natural pacing
            };
        }
    };

    const finishExam = async () => {
        stopAllMedia();
        setStage('report');
        setIsProcessing(true);
        try {
             const result = await generateExamReport(transcript, snapshots);
             setReport(result);
        } catch (e) {
            console.error(e);
            alert("Report generation failed. Please check network.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const downloadVideo = () => {
       alert("Video download not implemented in this demo mode.");
    };

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-fade-in font-sans text-white">
            
            {/* Loading Screen */}
            {stage === 'loading' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 bg-zinc-950">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-duo-green rounded-full border-t-transparent animate-spin"></div>
                        <Zap className="w-12 h-12 text-duo-green fill-current animate-pulse"/>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Preparing Exam Environment...</h2>
                        <p className="text-zinc-400 font-medium">Generating questions & Preloading audio ({loadingProgress}%)</p>
                    </div>
                    <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-duo-green transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Header */}
            {stage !== 'loading' && (
            <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-duo-green"/>
                    <span className="font-black text-lg">IELTS Mock Exam</span>
                    {stage !== 'setup' && stage !== 'report' && stage !== 'concluded' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
                             <div className={`w-2 h-2 rounded-full ${isUserSpeaking ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                             <span className="text-xs font-mono text-zinc-300">
                                 {isUserSpeaking ? 'REC' : isProcessing ? 'AI THINKING' : isExaminerSpeaking ? 'AI SPEAKING' : 'IDLE'}
                             </span>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            )}

            {/* Main Stage */}
            {stage !== 'loading' && (
            <div className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-hidden">
                
                {stage === 'setup' ? (
                    <div className="text-center space-y-6 max-w-md p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl animate-slide-up">
                        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-zinc-700 shadow-inner">
                            <Video className="w-10 h-10 text-zinc-500"/>
                        </div>
                        <h2 className="text-2xl font-black text-white">All Set!</h2>
                        <div className="text-left space-y-3 bg-black/20 p-4 rounded-xl text-sm text-zinc-400">
                            <p className="flex gap-2"><Check className="w-4 h-4 text-green-500"/> Audio Preloaded (Zero Latency)</p>
                            <p className="flex gap-2"><Check className="w-4 h-4 text-green-500"/> Questions Generated</p>
                            <p className="flex gap-2"><Mic className="w-4 h-4 text-blue-500"/> Auto-submit on 3s Silence</p>
                        </div>
                        
                        {permissionError && <div className="text-red-500 bg-red-500/10 p-3 rounded-lg text-sm font-bold">⚠️ Please allow camera & mic access</div>}
                        
                        <button onClick={handleStartExam} className="w-full py-4 bg-duo-green hover:bg-green-500 text-white font-black rounded-2xl text-lg shadow-lg shadow-green-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <Play className="w-5 h-5 fill-current"/> Start Now
                        </button>
                    </div>
                ) : stage !== 'report' ? (
                    <>
                        {/* --- AI EXAMINER AVATAR (CENTERED) --- */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl relative z-10 -mt-10">
                            {/* Avatar Container */}
                            <div className="relative w-64 h-64 flex items-center justify-center mb-10 transition-transform duration-500">
                                {/* Ambient Glow */}
                                <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${isExaminerSpeaking ? 'bg-blue-500/30 scale-125' : isProcessing ? 'bg-purple-500/20 scale-110' : 'bg-zinc-500/10 scale-90'}`}></div>
                                
                                {/* Core Avatar */}
                                <div className="relative w-40 h-40">
                                    {/* Rings */}
                                    {isExaminerSpeaking && (
                                        <>
                                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full opacity-40 animate-[ping_2s_linear_infinite]"></div>
                                            <div className="absolute inset-4 border-4 border-red-500 rounded-full opacity-40 animate-[ping_2s_linear_infinite_0.5s]"></div>
                                        </>
                                    )}
                                    
                                    {/* Main Circle */}
                                    <div className={`absolute inset-0 bg-zinc-900 rounded-full flex items-center justify-center border-4 shadow-2xl transition-all duration-300 ${isProcessing ? 'border-purple-500 shadow-purple-500/20' : isExaminerSpeaking ? 'border-blue-500 shadow-blue-500/30 scale-105' : 'border-zinc-700'}`}>
                                        {isProcessing ? (
                                            <Loader2 className="w-16 h-16 text-purple-500 animate-spin"/>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 p-4">
                                                <div className={`w-3 h-3 rounded-full bg-blue-500 ${isExaminerSpeaking ? 'animate-bounce' : 'opacity-50'}`}></div>
                                                <div className={`w-3 h-3 rounded-full bg-red-500 ${isExaminerSpeaking ? 'animate-bounce delay-100' : 'opacity-50'}`}></div>
                                                <div className={`w-3 h-3 rounded-full bg-yellow-500 ${isExaminerSpeaking ? 'animate-bounce delay-200' : 'opacity-50'}`}></div>
                                                <div className={`w-3 h-3 rounded-full bg-green-500 ${isExaminerSpeaking ? 'animate-bounce delay-300' : 'opacity-50'}`}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Dialogue & Controls */}
                            <div className="text-center space-y-6 max-w-2xl px-4 w-full">
                                {isExaminerSpeaking ? (
                                    <p className="text-2xl md:text-3xl font-medium text-white leading-relaxed animate-fade-in drop-shadow-md">
                                        "{currentExaminerText}"
                                    </p>
                                ) : isProcessing ? (
                                     <div className="flex flex-col items-center gap-2 animate-pulse">
                                        <span className="text-purple-400 text-lg font-bold tracking-widest">SAVING RESPONSE...</span>
                                     </div>
                                ) : isUserSpeaking ? (
                                    <div className="flex flex-col items-center gap-4 animate-slide-up">
                                        <div className="flex gap-1.5 h-12 items-end justify-center">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-2 bg-green-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]`} style={{ height: Math.random() * 30 + 10 + 'px', animationDelay: i * 0.1 + 's' }}></div>
                                            ))}
                                        </div>
                                        
                                        <button 
                                            onClick={stopUserRecording} 
                                            className="px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
                                        >
                                            <Square className="w-5 h-5 fill-current"/> Done Speaking
                                        </button>

                                        <div className="text-xs text-zinc-500 flex items-center gap-1.5 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
                                            <Command className="w-3 h-3"/> Auto-submit after 3s silence
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-zinc-500 text-sm">...</span>
                                )}
                            </div>
                        </div>

                        {/* --- USER VIDEO FEED (TOP RIGHT) --- */}
                        <div 
                            className={`absolute top-4 right-4 z-50 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-800 transition-all duration-300 group
                                ${videoSize === 'small' ? 'w-32 aspect-[3/4]' : 'w-64 md:w-80 aspect-[4/3]'}
                            `}
                        >
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                            
                            {/* Resize Controls (Hover) */}
                            <button 
                                onClick={() => setVideoSize(prev => prev === 'small' ? 'large' : 'small')}
                                className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur"
                            >
                                {videoSize === 'small' ? <Maximize2 className="w-4 h-4"/> : <Minimize2 className="w-4 h-4"/>}
                            </button>
                        </div>

                        {/* Topic Card Overlay (Part 2) */}
                        {(stage === 'part2_prep' || stage === 'part2_speak') && (
                            <div className="absolute top-24 left-4 md:left-8 w-[calc(100%-2rem)] md:w-80 bg-white text-zinc-900 p-6 rounded-2xl shadow-2xl animate-slide-up z-40 border-l-8 border-duo-blue">
                                <div className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Part 2 Topic Card</div>
                                <h3 className="font-bold text-xl mb-4 leading-tight">{part2Topic}</h3>
                                <div className="flex items-center gap-2 text-sm font-bold text-duo-blue bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <Clock className="w-5 h-5"/>
                                    {stage === 'part2_prep' ? `Prep Time: ${timer}s` : `Speaking: ${timer}s`}
                                </div>
                                {stage === 'part2_prep' && <div className="mt-3 text-xs text-zinc-500 italic border-t pt-2 border-zinc-100">You may take notes. The recording will start automatically.</div>}
                            </div>
                        )}
                        
                        {/* Stage Indicator (Top Left) */}
                        <div className="absolute top-4 left-4 px-4 py-2 bg-zinc-900/80 backdrop-blur rounded-xl text-xs font-bold text-zinc-400 border border-zinc-800 shadow-sm flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase text-zinc-600">Current Stage</span>
                            <span className="text-white text-sm">{stage.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                    </>
                ) : null}

                {/* Report Panel */}
                {stage === 'report' && (
                    <div className="absolute inset-0 z-20 bg-zinc-950 overflow-y-auto p-6 md:p-12 animate-in slide-in-from-bottom-10 fade-in duration-500">
                         <div className="max-w-4xl mx-auto pb-20">
                            <h2 className="text-5xl font-black mb-4 flex items-center gap-4 text-white"><Award className="w-12 h-12 text-duo-yellow"/> Exam Report</h2>
                            <p className="text-zinc-400 mb-10 text-lg">Detailed AI Analysis of your performance.</p>

                            {!report ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-6 text-zinc-500">
                                    <Loader2 className="w-12 h-12 animate-spin text-duo-green"/>
                                    <p className="font-medium animate-pulse">Generating your Band Score...</p>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in text-white">
                                    {/* Scores */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[
                                            { l: 'Overall', s: report.overallScore, c: 'text-white bg-duo-green border-duo-greenDark' },
                                            { l: 'Fluency', s: report.fluency, c: 'text-zinc-300 bg-zinc-900 border-zinc-800' },
                                            { l: 'Vocab', s: report.vocabulary, c: 'text-zinc-300 bg-zinc-900 border-zinc-800' },
                                            { l: 'Grammar', s: report.grammar, c: 'text-zinc-300 bg-zinc-900 border-zinc-800' },
                                            { l: 'Pronunciation', s: report.pronunciation, c: 'text-zinc-300 bg-zinc-900 border-zinc-800' },
                                        ].map((item, i) => (
                                            <div key={i} className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-b-4 ${item.c}`}>
                                                <span className="text-4xl font-black">{item.s}</span>
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{item.l}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Body Language */}
                                    <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-duo-blue"><User className="w-6 h-6"/> Expression & Body Language</h3>
                                        <p className="text-zinc-300 leading-relaxed text-lg">{report.expressionFeedback}</p>
                                    </div>

                                    {/* Detailed Feedback */}
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                                            <h4 className="font-bold text-zinc-500 text-xs uppercase mb-3 tracking-widest">Part 1 Feedback</h4>
                                            <p className="text-sm text-zinc-300 leading-relaxed">{report.part1Feedback}</p>
                                        </div>
                                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                                            <h4 className="font-bold text-zinc-500 text-xs uppercase mb-3 tracking-widest">Part 2 Feedback</h4>
                                            <p className="text-sm text-zinc-300 leading-relaxed">{report.part2Feedback}</p>
                                        </div>
                                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                                            <h4 className="font-bold text-zinc-500 text-xs uppercase mb-3 tracking-widest">Part 3 Feedback</h4>
                                            <p className="text-sm text-zinc-300 leading-relaxed">{report.part3Feedback}</p>
                                        </div>
                                    </div>

                                    {/* Optimizations */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-xl text-white">Sentence Optimization</h3>
                                        {report.optimizedSentences.map((opt, i) => (
                                            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
                                                <div className="flex flex-col md:flex-row gap-4 mb-2">
                                                    <div className="flex-1">
                                                        <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded mb-1 inline-block">ORIGINAL</span>
                                                        <p className="text-zinc-400 text-base line-through">{opt.original}</p>
                                                    </div>
                                                    <div className="hidden md:block text-zinc-700"><ArrowRight/></div>
                                                    <div className="flex-1">
                                                        <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded mb-1 inline-block">IMPROVED</span>
                                                        <p className="text-white text-base font-medium">{opt.improved}</p>
                                                    </div>
                                                </div>
                                                <p className="text-zinc-500 text-xs mt-2 pl-1 border-l-2 border-zinc-800">💡 {opt.reason}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex gap-4 pt-8">
                                        <button onClick={onClose} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-white transition-colors">Close</button>
                                        {userProfile.invitationCode?.toLowerCase() === 'linguaflow666888' ? (
                                            <button onClick={downloadVideo} className="flex-1 py-4 bg-duo-blue hover:bg-blue-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
                                                <Download className="w-5 h-5"/> Download Recording
                                            </button>
                                        ) : (
                                            <div className="flex-1 py-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 cursor-not-allowed opacity-50">
                                                <Download className="w-5 h-5"/> VIP Only
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                         </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default MockExamModal;
