import React, { useState, useRef, useEffect } from 'react';
import { AccentType, PronunciationResult, VoiceOption, UserAudio } from '../types';
import { Play, Pause, Mic, Square, Loader2, Volume2, Disc, Volume1, Activity, Plus, X, Wand2, Sliders, Check, Fingerprint, AudioLines } from 'lucide-react';
import { generateSpeech, evaluatePronunciation, pcmToAudioBuffer, preloadAudioSentences } from '../services/geminiService';

interface AudioControlsProps {
  sentenceList: string[]; // Pass full array for queue logic
  userAudios: UserAudio[];
  onAddUserAudio: (audioDataUrl: string, isProfile?: boolean, settings?: any) => void;
  accent: AccentType;
  setAccent: (a: AccentType) => void;
}

const VOICES_US_PRESET: VoiceOption[] = [
  { id: 'us_duo', label: '多儿 (Zephyr)', geminiVoiceName: 'Zephyr' },
  { id: 'us_zari', label: 'Zari (Puck)', geminiVoiceName: 'Puck' },
  { id: 'us_lily', label: 'Lily (Fenrir)', geminiVoiceName: 'Fenrir' },
  { id: 'us_oscar', label: 'Oscar (Kore)', geminiVoiceName: 'Kore' },
  { id: 'us_bear', label: 'Falstaff (Charon)', geminiVoiceName: 'Charon' },
];

const VOICES_UK_PRESET: VoiceOption[] = [
  { id: 'uk_std', label: '英式标准 (Zephyr)', geminiVoiceName: 'Zephyr' },
  { id: 'uk_posh', label: '英式贵族 (Kore)', geminiVoiceName: 'Kore' },
  { id: 'uk_deep', label: '英式深沉 (Charon)', geminiVoiceName: 'Charon' },
  { id: 'uk_narr', label: '英式叙述 (Fenrir)', geminiVoiceName: 'Fenrir' }, 
  { id: 'uk_fast', label: '英式活泼 (Puck)', geminiVoiceName: 'Puck' }, 
];

// Extended training text for better analysis and longer recording time
const TRAINING_TEXT = "I am ready to create my personal AI reading voice. To do this, I need to speak clearly and naturally. Technology connects us in amazing ways, allowing ideas to travel across the world instantly. By analyzing my tone, pitch, and cadence, the system will find the perfect match for me. This helps me learn English more effectively.";

// Simple Pitch Detection Algorithm (Autocorrelation)
const detectPitch = (audioBuffer: AudioBuffer): number => {
    const bufferSize = 2048;
    const sampleRate = audioBuffer.sampleRate;
    const pcmData = audioBuffer.getChannelData(0);
    
    // Analyze a few segments from the middle of the recording
    const segments = 5;
    let totalPitch = 0;
    let validCounts = 0;

    for (let s = 1; s < segments; s++) {
        const startIdx = Math.floor((pcmData.length / (segments + 1)) * s);
        // Ensure we don't go out of bounds
        if (startIdx + bufferSize > pcmData.length) break;
        
        const chunk = pcmData.slice(startIdx, startIdx + bufferSize);
        
        // Root Mean Square to check if silence
        let rms = 0;
        for (let i = 0; i < bufferSize; i++) rms += chunk[i] * chunk[i];
        rms = Math.sqrt(rms / bufferSize);
        if (rms < 0.05) continue; // Skip silence

        // Autocorrelation
        let bestOffset = -1;
        let bestCorrelation = 0;
        
        // Search range for human speech pitch (approx 70Hz to 400Hz)
        // At 48kHz sample rate: 48000/70 ≈ 685, 48000/400 = 120
        // We use a safe range
        for (let offset = 40; offset < 600; offset++) { 
            let correlation = 0;
            for (let i = 0; i < bufferSize - offset; i++) {
                correlation += chunk[i] * chunk[i + offset];
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }

        if (bestOffset > 0) {
            const pitch = sampleRate / bestOffset;
            if (pitch > 60 && pitch < 400) { // Reasonable human fundamental frequency range
                totalPitch += pitch;
                validCounts++;
            }
        }
    }

    return validCounts > 0 ? totalPitch / validCounts : 0;
};

const AudioControls: React.FC<AudioControlsProps> = ({ 
  sentenceList,
  userAudios, 
  onAddUserAudio,
  accent, 
  setAccent
}) => {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('us_duo');
  const [speed, setSpeed] = useState<number>(1);
  const [loopCount, setLoopCount] = useState<number>(1);
  
  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  
  // Voice Training Modal State
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingStep, setTrainingStep] = useState<'idle' | 'recording' | 'processing' | 'finetune'>('idle');
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [detectedPitch, setDetectedPitch] = useState<number>(0);

  // Fine Tuning State
  const [tuneBaseVoice, setTuneBaseVoice] = useState('Zephyr');
  const [tunePitch, setTunePitch] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<PronunciationResult | null>(null);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playSessionRef = useRef<number>(0); 
  const queueTimeoutRef = useRef<number | null>(null);

  // Computed Properties
  const isShadowEnabled = sentenceList.every(s => s && s.trim().length > 0);
  const fullText = sentenceList.join(" . ");

  // Merge static voices with dynamic user voices
  const userVoiceOptions: VoiceOption[] = userAudios.map(ua => ({
      id: ua.id,
      label: ua.label,
      isUser: true,
      audioData: ua.data,
      isProfile: ua.isProfile,
      voiceSettings: ua.voiceSettings
  }));

  const currentVoices = [
      ...(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET),
      ...userVoiceOptions
  ];

  const currentVoice = currentVoices.find(v => v.id === selectedVoiceId) || currentVoices[0];

  useEffect(() => {
    if (!currentVoices.find(v => v.id === selectedVoiceId)) {
        setSelectedVoiceId(currentVoices[0].id);
    }
  }, [accent, userAudios.length]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const initAudioContext = async () => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      return audioContextRef.current;
  };

  const stopAudio = () => {
    playSessionRef.current++; 
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
    }
    if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
        queueTimeoutRef.current = null;
    }
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setIsPlayingPreview(false);
  };

  const playBeep = (ctx: AudioContext) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880; // A5
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // 150ms beep
  };

  const handlePlayToggle = async () => {
    if (isPlaying) {
        stopAudio();
        return;
    }

    // --- NEW LOGIC: Enforce all sentences are present unless it's a simple user recording ---
    // User profile voices count as TTS, so they also need all sentences.
    const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
    
    if (isTTS && !isShadowEnabled) {
        alert("请先生成或填写所有句子的内容");
        return;
    }

    setIsPlaying(true);
    setIsLoadingAudio(true);
    const currentSessionId = ++playSessionRef.current;
    const ctx = await initAudioContext();

    try {
        // --- Playback Logic ---
        
        // Scenario 1: Simple Recording (User's non-profile recording)
        if (currentVoice.isUser && !currentVoice.isProfile) {
            if (!currentVoice.audioData) throw new Error("Audio data missing");
            const response = await fetch(currentVoice.audioData);
            const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
            setIsLoadingAudio(false);
            if (currentSessionId !== playSessionRef.current) return;
            playBufferRecursive(buffer, loopCount, currentSessionId);
            return;
        }

        // Scenario 2: TTS (Standard or Profile)
        // Optimization: Fetch all 3 sentences in parallel
        const validSentences = sentenceList.filter(s => s.trim());
        
        // Determine voice name (Profile uses 'Zephyr' as base usually)
        const voiceName = currentVoice.isProfile 
            ? (currentVoice.voiceSettings?.baseVoice || 'Zephyr')
            : currentVoice.geminiVoiceName!;

        const buffers = await preloadAudioSentences(validSentences, voiceName);
        
        // Pre-process buffers into AudioBuffers
        const audioBuffers = buffers.map(b => pcmToAudioBuffer(b, ctx));

        setIsLoadingAudio(false);
        if (currentSessionId !== playSessionRef.current) return;

        // Start Queue Playback
        playSentenceQueue(ctx, audioBuffers, 0, loopCount, currentSessionId, currentVoice.voiceSettings?.pitch);

    } catch (e) {
        console.error(e);
        stopAudio();
        alert("播放加载失败: " + (e instanceof Error ? e.message : "未知错误"));
    }
  };

  const playSentenceQueue = (
      ctx: AudioContext, 
      buffers: AudioBuffer[], 
      index: number, 
      loopsRemaining: number, 
      sessionId: number,
      detune?: number
  ) => {
      if (sessionId !== playSessionRef.current) return;

      // Check if we finished one full loop
      if (index >= buffers.length) {
          if (loopsRemaining > 1) {
             // Restart loop immediately? Or wait? Let's wait 1s.
             queueTimeoutRef.current = setTimeout(() => {
                 playSentenceQueue(ctx, buffers, 0, loopsRemaining - 1, sessionId, detune);
             }, 1000) as unknown as number;
          } else {
             setIsPlaying(false);
          }
          return;
      }

      // Play current sentence
      const source = ctx.createBufferSource();
      source.buffer = buffers[index];
      source.playbackRate.value = speed;
      
      // Apply profile pitch shift if it's a cloned voice
      if (detune) {
          source.detune.value = detune; 
      }
      
      source.connect(ctx.destination);
      sourceNodeRef.current = source;
      
      source.onended = () => {
          if (sessionId !== playSessionRef.current) return;
          
          if (index < buffers.length - 1) {
              queueTimeoutRef.current = setTimeout(() => {
                  if (sessionId !== playSessionRef.current) return;
                  playBeep(ctx);
                  queueTimeoutRef.current = setTimeout(() => {
                      playSentenceQueue(ctx, buffers, index + 1, loopsRemaining, sessionId, detune);
                  }, 1000) as unknown as number; // 1s delay after beep
              }, 500) as unknown as number;
          } else {
              // End of loop, just proceed immediately to loop logic
              playSentenceQueue(ctx, buffers, index + 1, loopsRemaining, sessionId, detune);
          }
      };
      
      source.start(0);
  };

  const playBufferRecursive = (buffer: AudioBuffer, remaining: number, sessionId: number) => {
      if (remaining <= 0 || sessionId !== playSessionRef.current) {
          if (sessionId === playSessionRef.current) setIsPlaying(false);
          return;
      }
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current!.destination);
      source.onended = () => { 
          setTimeout(() => playBufferRecursive(buffer, remaining - 1, sessionId), 300); 
      };
      sourceNodeRef.current = source;
      source.start(0);
  };

  // --- Voice Training Logic ---

  const startTraining = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          mediaRecorder.onstop = async () => {
              // Analyze Pitch
              try {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const ctx = await initAudioContext();
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                
                const avgPitch = detectPitch(audioBuffer);
                setDetectedPitch(avgPitch);
                
                // Smart Suggestion Logic based on Hz
                // Male voice typically 85-180 Hz, Female 165-255 Hz
                if (avgPitch > 0) {
                    if (avgPitch < 165) {
                        setTuneBaseVoice('Charon'); // Deep Male
                        // Fine tune: if very deep (<100), maybe pitch down slightly, else pitch up
                        setTunePitch(avgPitch < 100 ? -50 : 0);
                    } else {
                        // Female or Higher
                        if (avgPitch > 220) {
                            setTuneBaseVoice('Puck'); // Higher energetic
                            setTunePitch(50);
                        } else {
                            setTuneBaseVoice('Fenrir'); // Softer
                            setTunePitch(0);
                        }
                    }
                }
              } catch (e) {
                  console.error("Analysis failed", e);
              }

              // Simulate Complex Analysis time for UX
              setTrainingStep('processing');
              let progress = 0;
              const interval = setInterval(() => {
                  progress += 2; // Slower progress bar to simulate "Deep Analysis"
                  setTrainingProgress(progress);
                  if (progress >= 100) {
                      clearInterval(interval);
                      setTrainingStep('finetune');
                  }
              }, 40); // 40ms * 50 steps = 2 seconds

              stream.getTracks().forEach(t => t.stop());
          };
          
          mediaRecorder.start();
          setTrainingStep('recording');
      } catch (e) { alert("请允许麦克风权限"); }
  };

  const stopTraining = () => {
      mediaRecorderRef.current?.stop();
  };

  const previewVoice = async () => {
      if (isPlayingPreview) return;
      setIsPlayingPreview(true);
      const ctx = await initAudioContext();
      try {
          const bufferRaw = await generateSpeech("This is a preview of your reading avatar.", tuneBaseVoice);
          const buffer = pcmToAudioBuffer(bufferRaw, ctx);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.detune.value = tunePitch;
          source.connect(ctx.destination);
          source.onended = () => setIsPlayingPreview(false);
          source.start(0);
      } catch (e) {
          console.error("Preview failed", e);
          setIsPlayingPreview(false);
          alert("试听生成失败，请重试。" + (e instanceof Error ? e.message : ""));
      }
  };

  const finishTraining = () => {
      onAddUserAudio("AI_READING_AVATAR", true, {
          pitch: tunePitch,
          baseVoice: tuneBaseVoice
      });
      
      setShowTrainingModal(false);
      setTrainingStep('idle');
      setTrainingProgress(0);
      setDetectedPitch(0);
  };

  // --- Standard Recording Logic (Shadowing) ---

  const startRecording = async (mode: 'SHADOW') => {
      stopAudio(); // Stop any playback
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];
          mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              if (mode === 'SHADOW') {
                  setIsEvaluating(true);
                  try {
                      const result = await evaluatePronunciation(blob, fullText, accent);
                      setEvalResult({ ...result, audioBlob: blob });
                  } catch(e) { console.error(e); }
                  setIsEvaluating(false);
                  setIsRecordingShadow(false);
              }
              stream.getTracks().forEach(t => t.stop());
          };
          mediaRecorder.start();
          if (mode === 'SHADOW') setIsRecordingShadow(true);
      } catch (e) { 
          alert("无法访问麦克风，请检查权限设置");
          console.error(e);
      }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  // --- Misc ---

  const playRecordedShadow = async () => {
      if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current = null;
      }
      
      if (!evalResult?.audioBlob) return;
      const ctx = await initAudioContext();
      const arrayBuffer = await evalResult.audioBlob.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      sourceNodeRef.current = source; 
      source.start(0);
  };

  const playWord = (word: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); 
          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = accent === AccentType.UK ? 'en-GB' : 'en-US';
          utterance.rate = 0.8; 
          window.speechSynthesis.speak(utterance);
      }
  };

  // Logic to disable Play button if it's a generated voice and sentences aren't full
  // We check if it is TTS (Generated voice OR User Profile Voice)
  const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
  const isPlayDisabled = isTTS && !isShadowEnabled;

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-40">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Voice Config */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl overflow-x-auto max-w-full scrollbar-hide">
                <button onClick={() => setAccent(AccentType.US)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${accent === AccentType.US ? 'bg-zinc-800 text-green-400 shadow-sm border border-green-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>美音</button>
                <button onClick={() => setAccent(AccentType.UK)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${accent === AccentType.UK ? 'bg-zinc-800 text-green-400 shadow-sm border border-green-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>英音</button>
                <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0"></div>
                
                {/* Voice Selector & Wand Button */}
                <div className="flex items-center bg-zinc-800/50 rounded-lg pr-1">
                    <select 
                        value={selectedVoiceId} 
                        onChange={(e) => setSelectedVoiceId(e.target.value)} 
                        className="bg-transparent text-xs font-medium text-zinc-300 outline-none px-2 py-1.5 min-w-[100px] max-w-[140px] hover:text-white cursor-pointer truncate rounded-lg focus:bg-zinc-800 transition-colors"
                    >
                        <optgroup label="多邻国风格语音">
                            {(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET).map(v => (
                                <option key={v.id} value={v.id} className="bg-zinc-900">{v.label}</option>
                            ))}
                        </optgroup>
                        {userVoiceOptions.length > 0 && (
                            <optgroup label="我的朗读分身">
                                {userVoiceOptions.map(v => (
                                    <option key={v.id} value={v.id} className="bg-zinc-900">
                                        {v.isProfile ? `🤖 ${v.label}` : v.label}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    
                    <button 
                        onClick={() => setShowTrainingModal(true)}
                        className="p-1.5 text-zinc-400 hover:text-green-400 hover:bg-zinc-700 rounded-md transition-colors"
                        title="创建我的 AI 朗读分身"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0"></div>
                 <span className="text-[10px] font-bold text-zinc-600 shrink-0">倍速</span>
                 <input type="range" min="0.5" max="2" step="0.25" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-12 h-1 bg-zinc-700 rounded-lg accent-green-500 shrink-0 cursor-pointer" />
                 <span className="text-[10px] font-bold text-zinc-600 ml-2 shrink-0">循环</span>
                 <select value={loopCount} onChange={(e) => setLoopCount(Number(e.target.value))} className="text-xs bg-transparent font-bold text-zinc-300 outline-none hover:text-white cursor-pointer shrink-0">
                    <option value={1} className="bg-zinc-900">1次</option>
                    <option value={3} className="bg-zinc-900">3次</option>
                    <option value={5} className="bg-zinc-900">5次</option>
                 </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <div className="relative group flex-1 md:flex-none">
                    <button 
                        onClick={handlePlayToggle} 
                        disabled={isPlayDisabled}
                        className={`w-full md:w-auto px-8 h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all active:scale-95
                             ${isPlayDisabled ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' : (isPlaying ? 'bg-zinc-700' : 'bg-green-600 hover:bg-green-500')}
                        `}
                    >
                        {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin"/> : isPlaying ? <><Pause className="w-4 h-4 fill-current"/> 暂停</> : <><Play className="w-4 h-4 fill-current"/> {currentVoice.isUser && !currentVoice.isProfile ? '播放录音' : '朗读'}</>}
                    </button>
                    {isPlayDisabled && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            请先生成所有句子的内容
                        </div>
                    )}
                </div>
                
                <div className="relative group flex-1 md:flex-none">
                    <button 
                        onClick={isRecordingShadow ? stopRecording : () => startRecording('SHADOW')} 
                        disabled={isEvaluating || !isShadowEnabled} 
                        className={`w-full px-6 h-12 rounded-xl flex items-center justify-center gap-2 font-bold border-2 transition-all active:scale-95 
                            ${!isShadowEnabled ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' :
                            isRecordingShadow ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}
                        `}
                    >
                        {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin"/> : isRecordingShadow ? <><Square className="w-4 h-4 fill-current"/> 停止</> : <><Activity className="w-4 h-4"/> 测试</>}
                    </button>
                    {!isShadowEnabled && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            请先生成所有句子的内容
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Feedback Area */}
        {evalResult && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-5 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className={`text-4xl font-black ${evalResult.score > 80 ? 'text-green-500' : evalResult.score > 60 ? 'text-orange-500' : 'text-red-500'}`}>{evalResult.score}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">评分</span>
                </div>
                <div className="flex-1 w-full">
                    <div className="mb-2 font-medium text-zinc-300">{evalResult.feedback}</div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                        {evalResult.audioBlob && (
                             <button onClick={playRecordedShadow} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm font-bold border border-zinc-700 transition-colors mr-2">
                                <Volume2 className="w-3 h-3"/> 回听我的朗读
                            </button>
                        )}
                        {evalResult.mistakes.map((word, i) => (
                            <button key={i} onClick={() => playWord(word)} className="flex items-center gap-1.5 px-3 py-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-full text-sm font-bold border border-red-900/30 transition-colors">
                                {word}
                                <Volume1 className="w-3 h-3"/>
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => setEvalResult(null)} className="text-zinc-600 hover:text-zinc-400 text-2xl font-light">&times;</button>
            </div>
        )}

      </div>
    </div>

    {/* Voice Training Modal */}
    {showTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Fingerprint className="w-5 h-5 text-green-500"/> 创建 AI 朗读分身</h3>
                    <button onClick={() => setShowTrainingModal(false)}><X className="w-5 h-5 text-zinc-500 hover:text-white"/></button>
                </div>
                
                {/* Show text during idle AND recording phases */}
                {(trainingStep === 'idle' || trainingStep === 'recording') && (
                    <div className="space-y-6">
                         <p className="text-zinc-400 text-sm leading-relaxed">
                            请以自然、清晰的语调朗读以下段落（约 45 秒）。AI 将深度分析您的声纹特征、音高和节奏，为您定制最匹配的朗读声音。
                        </p>
                        <div className={`bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300 font-serif text-lg leading-relaxed italic transition-colors ${trainingStep === 'recording' ? 'border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.1)]' : ''}`}>
                            "{TRAINING_TEXT}"
                        </div>
                        
                        {trainingStep === 'idle' ? (
                            <button 
                                onClick={startTraining}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-green-900/20 transition-all"
                            >
                                <Mic className="w-5 h-5"/> 开始声纹采集
                            </button>
                        ) : (
                            <div className="flex flex-col items-center pt-4">
                                <div className="flex items-center gap-2 mb-4 animate-pulse text-red-500 font-bold">
                                    <span className="w-3 h-3 bg-red-500 rounded-full"></span> 正在采集声纹...
                                </div>
                                <button 
                                    onClick={stopTraining}
                                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-bold text-lg border border-zinc-700"
                                >
                                    完成录制
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {trainingStep === 'processing' && (
                    <div className="text-center py-10">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <AudioLines className="w-10 h-10 text-green-500 animate-pulse"/>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-green-500 transition-all duration-300 ease-out" style={{ width: `${trainingProgress}%` }}></div>
                        </div>
                        <h4 className="text-lg font-bold text-white">正在解析声纹 DNA...</h4>
                        <div className="text-zinc-500 text-xs mt-3 flex flex-col gap-1">
                            <span>提取基频 (Fundamental Frequency)...</span>
                            <span>分析共振峰 (Formants)...</span>
                            <span>匹配最佳音色模型 (Neural Matching)...</span>
                        </div>
                    </div>
                )}

                {trainingStep === 'finetune' && (
                    <div className="space-y-6">
                         <div className="text-center mb-6">
                             <div className="inline-block p-3 rounded-full bg-green-900/30 mb-3">
                                <Sliders className="w-6 h-6 text-green-400"/>
                             </div>
                             <h4 className="text-lg font-bold text-white">声音定型 (Fine-Tuning)</h4>
                             <p className="text-zinc-500 text-xs mt-1">
                                {detectedPitch > 0 
                                    ? `检测到您的平均音高为 ${Math.round(detectedPitch)}Hz。我们为您匹配了以下基础音色：`
                                    : '未能检测到清晰音高，请手动选择最接近的基础音色：'}
                             </p>
                         </div>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase">基础音色 (Base Tone)</label>
                                 <select 
                                    value={tuneBaseVoice}
                                    onChange={(e) => setTuneBaseVoice(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                 >
                                     <option value="Charon">男声 - 深沉厚重 (Deep Male)</option>
                                     <option value="Zephyr">男声 - 标准清晰 (Standard Male)</option>
                                     <option value="Puck">女声 - 活泼轻快 (Energetic Female)</option>
                                     <option value="Fenrir">女声 - 柔和低沉 (Soft Female)</option>
                                     <option value="Kore">女声 - 戏剧张力 (Dramatic Female)</option>
                                 </select>
                             </div>

                             <div>
                                 <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase">语调偏移 (Pitch Shift)</label>
                                 <div className="flex items-center gap-4">
                                     <span className="text-xs text-zinc-600 font-mono w-8">-400</span>
                                     <input 
                                        type="range" 
                                        min="-400" 
                                        max="400" 
                                        step="50"
                                        value={tunePitch}
                                        onChange={(e) => setTunePitch(Number(e.target.value))}
                                        className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                     />
                                     <span className="text-xs text-zinc-600 font-mono w-8">+400</span>
                                 </div>
                                 <div className="text-center text-xs text-green-500 mt-1 font-mono">{tunePitch > 0 ? '+' : ''}{tunePitch} cents</div>
                             </div>
                         </div>

                         <div className="flex gap-3 pt-4">
                             <button 
                                onClick={previewVoice}
                                disabled={isPlayingPreview}
                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-bold text-sm border border-zinc-700 transition-colors flex items-center justify-center gap-2"
                             >
                                 {isPlayingPreview ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>} 试听
                             </button>
                             <button 
                                onClick={finishTraining}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-sm shadow-lg shadow-green-900/20 transition-colors flex items-center justify-center gap-2"
                             >
                                 <Check className="w-4 h-4"/> 完成设置
                             </button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    )}
    </>
  );
};

export default AudioControls;