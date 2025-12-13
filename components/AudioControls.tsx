import React, { useState, useRef, useEffect } from 'react';
import { AccentType, PronunciationResult, VoiceOption, UserAudio } from '../types';
import { Play, Pause, Square, Loader2, Volume2, Activity, X, Settings2 } from 'lucide-react';
import { evaluatePronunciation, pcmToAudioBuffer, preloadAudioSentences } from '../services/geminiService';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';

interface AudioControlsProps {
  sentenceList: string[];
  userAudios: UserAudio[];
  onAddUserAudio: (audioDataUrl: string, isProfile?: boolean, settings?: any) => void;
  accent: AccentType;
  setAccent: (a: AccentType) => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({ 
  sentenceList,
  userAudios, 
  onAddUserAudio,
  accent, 
  setAccent,
  selectedVoiceId,
  setSelectedVoiceId
}) => {
  const [speed, setSpeed] = useState<number>(1);
  const [loopCount, setLoopCount] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  
  // Eval State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<PronunciationResult | null>(null);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playSessionRef = useRef<number>(0); 
  const queueTimeoutRef = useRef<number | null>(null);

  const isShadowEnabled = sentenceList.every(s => s && s.trim().length > 0);
  const fullText = sentenceList.join(" . ");

  // Voices
  const userVoiceOptions: VoiceOption[] = userAudios.map(ua => ({
      id: ua.id, label: ua.label, isUser: true, audioData: ua.data, isProfile: ua.isProfile, voiceSettings: ua.voiceSettings
  }));
  const currentVoices = [...(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET), ...userVoiceOptions];
  const currentVoice = currentVoices.find(v => v.id === selectedVoiceId) || currentVoices[0];

  useEffect(() => { return () => stopAudio(); }, []);

  const initAudioContext = async () => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      return audioContextRef.current;
  };

  const stopAudio = () => {
    playSessionRef.current++; // Invalidate previous sessions immediately
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
  };

  const playBeep = (ctx: AudioContext) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880; 
      osc.type = 'sine';
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.1); 
  };

  const handlePlayToggle = async () => {
    // 1. Always stop first to clear any existing audio/timeouts
    const wasPlaying = isPlaying;
    stopAudio();
    
    if (wasPlaying) return; // If we were playing, we just stopped.

    const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
    if (isTTS && !isShadowEnabled) { alert("请先生成或填写所有句子的内容"); return; }

    setIsPlaying(true);
    setIsLoadingAudio(true);
    
    const currentSessionId = ++playSessionRef.current; 
    
    try {
        const ctx = await initAudioContext();
        if (currentSessionId !== playSessionRef.current) return;

        // User Recording Playback
        if (currentVoice.isUser && !currentVoice.isProfile) {
            const response = await fetch(currentVoice.audioData!);
            const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
            setIsLoadingAudio(false);
            if (currentSessionId !== playSessionRef.current) return;
            playBufferRecursive(buffer, loopCount, currentSessionId);
            return;
        }

        // TTS Playback
        const voiceName = currentVoice.isProfile ? (currentVoice.voiceSettings?.baseVoice || 'Zephyr') : currentVoice.geminiVoiceName!;
        const buffers = await preloadAudioSentences(sentenceList.filter(s => s.trim()), voiceName);
        if (currentSessionId !== playSessionRef.current) return;
        
        const audioBuffers = buffers.map(b => pcmToAudioBuffer(b, ctx));
        setIsLoadingAudio(false);
        if (currentSessionId !== playSessionRef.current) return;

        playSentenceQueue(ctx, audioBuffers, 0, loopCount, currentSessionId, currentVoice.voiceSettings?.pitch);
    } catch (e) {
        console.error(e);
        stopAudio();
        alert("Playback Failed");
    }
  };

  const playSentenceQueue = (ctx: AudioContext, buffers: AudioBuffer[], index: number, loopsRemaining: number, sessionId: number, detune?: number) => {
      if (sessionId !== playSessionRef.current) return;
      if (index >= buffers.length) {
          if (loopsRemaining > 1) {
             queueTimeoutRef.current = setTimeout(() => {
                 playSentenceQueue(ctx, buffers, 0, loopsRemaining - 1, sessionId, detune);
             }, 1000) as unknown as number;
          } else { setIsPlaying(false); }
          return;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffers[index];
      source.playbackRate.value = speed;
      if (detune) source.detune.value = detune; 
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
                  }, 800) as unknown as number; 
              }, 400) as unknown as number;
          } else {
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
      source.onended = () => { setTimeout(() => playBufferRecursive(buffer, remaining - 1, sessionId), 300); };
      sourceNodeRef.current = source;
      source.start(0);
  };

  const startRecording = async (mode: 'SHADOW') => {
      stopAudio(); 
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
      } catch (e) { alert("Mic Error"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const playRecordedShadow = async () => {
      if (sourceNodeRef.current) { sourceNodeRef.current.stop(); sourceNodeRef.current = null; }
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

  const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
  const isPlayDisabled = isTTS && !isShadowEnabled;

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800 pb-6 pt-3 px-4 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-3">
            
            {/* Row 1: Settings (No Scrolling) */}
            <div className="flex items-center justify-between gap-3">
                {/* Accent & Voice */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 shrink-0">
                        <button onClick={() => setAccent(AccentType.US)} className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${accent === AccentType.US ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>US</button>
                        <button onClick={() => setAccent(AccentType.UK)} className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${accent === AccentType.UK ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>UK</button>
                    </div>
                    
                    <div className="relative flex-1 min-w-0">
                        <select 
                            value={selectedVoiceId} 
                            onChange={(e) => setSelectedVoiceId(e.target.value)} 
                            className="w-full bg-zinc-900 text-xs font-medium text-zinc-300 border border-zinc-800 rounded-lg px-2 py-1.5 outline-none focus:border-green-500/50 appearance-none truncate"
                        >
                            <optgroup label="Standard Voices">
                                {(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET).map(v => (
                                    <option key={v.id} value={v.id}>{v.label}</option>
                                ))}
                            </optgroup>
                            {userVoiceOptions.length > 0 && (
                                <optgroup label="User Recordings">
                                    {userVoiceOptions.map(v => (
                                        <option key={v.id} value={v.id}>{v.label}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        {/* Custom arrow for select */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Settings2 className="w-3 h-3 text-zinc-600"/>
                        </div>
                    </div>
                </div>

                {/* Speed & Loop (Compact) */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-zinc-900 rounded-lg px-2 py-1 border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 w-6 text-center">{speed}x</span>
                        <input type="range" min="0.5" max="2" step="0.25" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-10 h-1 bg-zinc-700 rounded-lg accent-zinc-400 cursor-pointer" />
                    </div>
                    <button 
                        onClick={() => setLoopCount(loopCount === 1 ? 3 : loopCount === 3 ? 5 : 1)} 
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-400 min-w-[30px]"
                    >
                        {loopCount}↺
                    </button>
                </div>
            </div>

            {/* Row 2: Main Actions */}
            <div className="flex gap-3">
                <button 
                    onClick={handlePlayToggle} 
                    disabled={isPlayDisabled}
                    className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg transition-all active:scale-95
                            ${isPlayDisabled ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : (isPlaying ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20')}
                    `}
                >
                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin"/> : isPlaying ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current"/>}
                    <span className="hidden sm:inline">{currentVoice.isUser && !currentVoice.isProfile ? '播放录音' : '开始跟读'}</span>
                </button>
                
                <button 
                    onClick={isRecordingShadow ? stopRecording : () => startRecording('SHADOW')} 
                    disabled={isEvaluating || !isShadowEnabled} 
                    className={`h-10 px-6 rounded-xl flex items-center justify-center gap-2 font-bold border transition-all active:scale-95 
                        ${!isShadowEnabled ? 'bg-zinc-950 border-zinc-900 text-zinc-700' :
                        isRecordingShadow ? 'bg-red-900/20 border-red-900/50 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'}
                    `}
                >
                    {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin"/> : isRecordingShadow ? <Square className="w-4 h-4 fill-current"/> : <Activity className="w-4 h-4"/>}
                    <span className="text-xs">{isRecordingShadow ? '停止' : '评测'}</span>
                </button>
            </div>

            {/* Feedback Overlay */}
            {evalResult && (
                <div className="absolute bottom-full left-4 right-4 mb-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
                        <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center min-w-[60px]">
                            <span className={`text-3xl font-black ${evalResult.score > 80 ? 'text-green-500' : 'text-orange-500'}`}>{evalResult.score}</span>
                            <span className="text-[9px] uppercase text-zinc-500 font-bold">Score</span>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-sm text-zinc-300 leading-snug">{evalResult.feedback}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {evalResult.audioBlob && (
                                    <button onClick={playRecordedShadow} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded border border-zinc-700 flex items-center gap-1">
                                        <Volume2 className="w-3 h-3"/> 回听
                                    </button>
                                )}
                                {evalResult.mistakes.map((m, i) => (
                                    <button key={i} onClick={() => playWord(m)} className="px-2 py-0.5 bg-red-900/20 text-red-400 text-[10px] rounded border border-red-900/30 hover:bg-red-900/40 transition-colors">
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setEvalResult(null)} className="p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X className="w-4 h-4"/></button>
                        </div>
                </div>
            )}
        </div>
    </div>
    </>
  );
};

export default AudioControls;