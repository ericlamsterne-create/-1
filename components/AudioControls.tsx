
import React, { useState, useRef, useEffect } from 'react';
import { AccentType, PronunciationResult, VoiceOption, UserAudio } from '../types';
import { Play, Pause, Square, Loader2, Volume2, Activity, X, Settings2, Mic, Repeat } from 'lucide-react';
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<PronunciationResult | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playSessionRef = useRef<number>(0); 
  const queueTimeoutRef = useRef<number | null>(null);

  const isShadowEnabled = sentenceList.every(s => s && s.trim().length > 0);
  const fullText = sentenceList.join(" . ");

  const userVoiceOptions: VoiceOption[] = userAudios.map(ua => ({ id: ua.id, label: ua.label, isUser: true, audioData: ua.data, isProfile: ua.isProfile, voiceSettings: ua.voiceSettings }));
  const currentVoices = [...(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET), ...userVoiceOptions];
  const currentVoice = currentVoices.find(v => v.id === selectedVoiceId) || currentVoices[0];

  useEffect(() => { return () => stopAudio(); }, []);

  const initAudioContext = async () => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      return audioContextRef.current;
  };

  const stopAudio = () => {
    playSessionRef.current++;
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e) {} sourceNodeRef.current = null; }
    if (queueTimeoutRef.current) { clearTimeout(queueTimeoutRef.current); queueTimeoutRef.current = null; }
    setIsPlaying(false); setIsLoadingAudio(false);
  };

  const playBeep = (ctx: AudioContext) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.05; osc.start(); osc.stop(ctx.currentTime + 0.1); 
  };

  const handlePlayToggle = async () => {
    const wasPlaying = isPlaying; stopAudio(); if (wasPlaying) return;
    const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
    if (isTTS && !isShadowEnabled) { alert("请先生成内容"); return; }
    setIsPlaying(true); setIsLoadingAudio(true);
    const currentSessionId = ++playSessionRef.current; 
    try {
        const ctx = await initAudioContext();
        if (currentSessionId !== playSessionRef.current) return;
        if (currentVoice.isUser && !currentVoice.isProfile) {
            const response = await fetch(currentVoice.audioData!);
            const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
            setIsLoadingAudio(false);
            if (currentSessionId !== playSessionRef.current) return;
            playBufferRecursive(buffer, loopCount, currentSessionId);
            return;
        }
        const voiceName = currentVoice.isProfile ? (currentVoice.voiceSettings?.baseVoice || 'Zephyr') : currentVoice.geminiVoiceName!;
        const buffers = await preloadAudioSentences(sentenceList.filter(s => s.trim()), voiceName);
        if (currentSessionId !== playSessionRef.current) return;
        const audioBuffers = buffers.map(b => pcmToAudioBuffer(b, ctx));
        setIsLoadingAudio(false);
        if (currentSessionId !== playSessionRef.current) return;
        playSentenceQueue(ctx, audioBuffers, 0, loopCount, currentSessionId, currentVoice.voiceSettings?.pitch);
    } catch (e) { console.error(e); stopAudio(); alert("播放失败"); }
  };

  const playSentenceQueue = (ctx: AudioContext, buffers: AudioBuffer[], index: number, loopsRemaining: number, sessionId: number, detune?: number) => {
      if (sessionId !== playSessionRef.current) return;
      if (index >= buffers.length) {
          if (loopsRemaining > 1) { queueTimeoutRef.current = setTimeout(() => { playSentenceQueue(ctx, buffers, 0, loopsRemaining - 1, sessionId, detune); }, 1000) as unknown as number; } 
          else { setIsPlaying(false); } return;
      }
      const source = ctx.createBufferSource(); source.buffer = buffers[index]; source.playbackRate.value = speed;
      if (detune) source.detune.value = detune; source.connect(ctx.destination); sourceNodeRef.current = source;
      source.onended = () => {
          if (sessionId !== playSessionRef.current) return;
          if (index < buffers.length - 1) { queueTimeoutRef.current = setTimeout(() => { if (sessionId !== playSessionRef.current) return; playBeep(ctx); queueTimeoutRef.current = setTimeout(() => { playSentenceQueue(ctx, buffers, index + 1, loopsRemaining, sessionId, detune); }, 800) as unknown as number; }, 400) as unknown as number; } 
          else { playSentenceQueue(ctx, buffers, index + 1, loopsRemaining, sessionId, detune); }
      };
      source.start(0);
  };

  const playBufferRecursive = (buffer: AudioBuffer, remaining: number, sessionId: number) => {
      if (remaining <= 0 || sessionId !== playSessionRef.current) { if (sessionId === playSessionRef.current) setIsPlaying(false); return; }
      const source = audioContextRef.current!.createBufferSource(); source.buffer = buffer; source.connect(audioContextRef.current!.destination);
      source.onended = () => { setTimeout(() => playBufferRecursive(buffer, remaining - 1, sessionId), 300); };
      sourceNodeRef.current = source; source.start(0);
  };

  const startRecording = async (mode: 'SHADOW') => {
      stopAudio(); 
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream); 
          mediaRecorderRef.current = mediaRecorder; 
          chunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          
          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              if (mode === 'SHADOW') {
                  setIsEvaluating(true);
                  try { const result = await evaluatePronunciation(blob, fullText, accent); setEvalResult({ ...result, audioBlob: blob }); } catch(e) { console.error(e); }
                  setIsEvaluating(false); setIsRecordingShadow(false);
              }
              stream.getTracks().forEach(t => t.stop());
          };
          
          mediaRecorder.start(1000); // 1s timeslice for stability
          if (mode === 'SHADOW') setIsRecordingShadow(true);
      } catch (e) { alert("无法访问麦克风"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const playRecordedShadow = async () => {
      if (sourceNodeRef.current) { sourceNodeRef.current.stop(); sourceNodeRef.current = null; }
      if (!evalResult?.audioBlob) return;
      const ctx = await initAudioContext(); const arrayBuffer = await evalResult.audioBlob.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer); const source = ctx.createBufferSource();
      source.buffer = buffer; source.connect(ctx.destination); sourceNodeRef.current = source; source.start(0);
  };

  const playWord = (word: string) => {
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); utterance.lang = accent === AccentType.UK ? 'en-GB' : 'en-US'; utterance.rate = 0.8; window.speechSynthesis.speak(utterance); }
  };

  const isTTS = !currentVoice.isUser || (currentVoice.isUser && currentVoice.isProfile);
  const isPlayDisabled = isTTS && !isShadowEnabled;

  return (
    <>
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl">
        {/* Floating Glass Dock - 增强的模糊和阴影 */}
        <div className="glass-panel bg-white/80 rounded-full px-5 py-3 shadow-glass-lg flex items-center justify-between gap-4 border border-white/60 backdrop-blur-2xl ring-1 ring-white/50">
            
            {/* Left: Controls */}
            <div className="flex items-center gap-3">
                <button onClick={() => setAccent(accent === AccentType.US ? AccentType.UK : AccentType.US)} className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 text-[10px] font-bold text-fg-main border border-gray-200 flex items-center justify-center transition-all active:scale-95 shadow-sm">
                    {accent}
                </button>
                <div className="relative group">
                     <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="appearance-none bg-white hover:bg-gray-50 text-xs font-bold text-fg-main border border-gray-200 rounded-full pl-4 pr-9 h-10 outline-none transition-all cursor-pointer w-36 truncate shadow-sm">
                        <optgroup label="标准语音">{(accent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET).map(v => (<option key={v.id} value={v.id}>{v.label}</option>))}</optgroup>
                        {userVoiceOptions.length > 0 && <optgroup label="我的语音">{userVoiceOptions.map(v => (<option key={v.id} value={v.id}>{v.label}</option>))}</optgroup>}
                    </select>
                    <Settings2 className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                </div>
                
                {/* Speed & Loop - compacted */}
                <div className="flex flex-col gap-1 items-center">
                    <input type="range" min="0.5" max="2" step="0.25" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-16 h-1.5 bg-gray-200 rounded-lg accent-primary cursor-pointer"/>
                    <button onClick={() => setLoopCount(loopCount === 1 ? 3 : loopCount === 3 ? 5 : 1)} className="text-[9px] font-bold text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5"/> {loopCount} 次
                    </button>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-3 pl-4 border-l border-gray-200/60">
                <button 
                    onClick={handlePlayToggle} 
                    disabled={isPlayDisabled}
                    className={`h-12 px-8 rounded-full flex items-center justify-center gap-2.5 font-bold text-sm shadow-xl transition-all active:scale-95 hover:-translate-y-0.5
                            ${isPlayDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : (isPlaying ? 'bg-white text-primary border border-primary/20 ring-4 ring-primary/10' : 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-primary/30')}
                    `}
                >
                    {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin"/> : isPlaying ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
                    <span className="hidden sm:inline">{isLoadingAudio ? '加载中' : isPlaying ? '暂停' : '播放'}</span>
                </button>
                
                <button 
                    onClick={isRecordingShadow ? stopRecording : () => startRecording('SHADOW')} 
                    disabled={isEvaluating || !isShadowEnabled} 
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-bold border transition-all active:scale-95 shadow-lg
                        ${!isShadowEnabled ? 'bg-gray-100 text-gray-400 border-transparent shadow-none' :
                        isRecordingShadow ? 'bg-red-50 border-red-200 text-red-500 animate-pulse ring-4 ring-red-100' : 'bg-white text-fg-main hover:bg-gray-50 border-white'}
                    `}
                    title="影子跟读评测"
                >
                    {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin"/> : isRecordingShadow ? <Square className="w-4 h-4 fill-current"/> : <Activity className="w-5 h-5"/>}
                </button>
            </div>
        </div>

        {/* Feedback Popup - 更干净的背景 */}
        {evalResult && (
            <div className="absolute bottom-full left-0 right-0 mb-6 glass-panel bg-white/95 p-6 rounded-[2rem] shadow-glass-hover animate-slide-up border border-white ring-1 ring-white/60">
                    <div className="flex items-start gap-5">
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-inner border border-white">
                        <span className={`text-2xl font-black ${evalResult.score > 80 ? 'text-green-500' : 'text-orange-500'}`}>{evalResult.score}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">得分</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        <p className="text-sm text-gray-800 font-medium leading-relaxed">{evalResult.feedback}</p>
                        <div className="flex flex-wrap gap-2">
                            {evalResult.audioBlob && <button onClick={playRecordedShadow} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-primary/20 transition-colors"><Volume2 className="w-3.5 h-3.5"/> 回放录音</button>}
                            {evalResult.mistakes.map((m, i) => <button key={i} onClick={() => playWord(m)} className="px-2 py-1 bg-red-100 text-red-500 text-[10px] font-bold rounded-lg hover:bg-red-200 transition-colors border border-red-200">{m}</button>)}
                        </div>
                    </div>
                    <button onClick={() => setEvalResult(null)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
            </div>
        )}
    </div>
    </>
  );
};

export default AudioControls;
