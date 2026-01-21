
import React, { useState, useRef, useEffect } from 'react';
import { SentenceData, AccentType, PronunciationResult } from '../types';
import { Edit3, X, Loader2, Sparkles, Check, Volume2, Mic, StopCircle, Play, Pause, Save, Undo2, Download, MicOff } from 'lucide-react';
import { evaluatePronunciation, createWavBlob, generateSpeech } from '../services/geminiService';
import { SENTENCE_FORMULAS } from '../data/sentenceFormulas';

interface SentenceCardProps {
  data: SentenceData;
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
  const [isOptimizing, setIsOptimizing] = useState(false);
  const contentAudioId = `card-${index}-content`;
  const questionAudioId = `card-${index}-question`;
  const isPlayingContent = globalPlayingId === contentAudioId;
  const isLoadingContent = isGlobalLoading && isPlayingContent;
  const isPlayingQuestion = globalPlayingId === questionAudioId;
  const isLoadingQuestion = isGlobalLoading && isPlayingQuestion;
  
  // Audio & Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [evalResult, setEvalResult] = useState<PronunciationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Input Recording State (Real-time Speech-to-Text)
  const [isInputRecording, setIsInputRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // User Recording Playback State
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const isFinalized = !!data.content;
  
  // Card Style
  const cardStyle = isFinalized 
      ? "bg-bg-card border-2 border-border hover:border-duo-blue/50 shadow-none hover:shadow-sm" 
      : "bg-bg-input border-2 border-dashed border-border/60 shadow-none";

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  useEffect(() => {
    if (!isEditing) setEditValue(data.content);
  }, [data.content, isEditing]);

  // Clean up user audio playback when component unmounts or eval result is cleared
  useEffect(() => {
      return () => {
          if (userAudioRef.current) {
              userAudioRef.current.pause();
              userAudioRef.current = null;
          }
          if (recognitionRef.current) {
              recognitionRef.current.stop();
          }
      };
  }, [evalResult]);

  const getSupportedMimeType = () => {
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) return t;
      }
      return '';
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = getSupportedMimeType();
          
          if (!mimeType) {
              alert("Browser does not support audio recording.");
              return;
          }

          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                  chunksRef.current.push(e.data);
              }
          };

          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              setIsEvaluating(true);
              try {
                  const result = await evaluatePronunciation(blob, data.content, accent);
                  setEvalResult({ ...result, audioBlob: blob });
              } catch (e) {
                  console.error("Evaluation failed", e);
                  alert("评测失败，请检查网络或重试");
              } finally {
                  setIsEvaluating(false);
                  setIsRecording(false);
                  stream.getTracks().forEach(t => t.stop());
              }
          };

          mediaRecorder.start(1000);
          setIsRecording(true);
          setEvalResult(null);
          // Stop any playing user audio
          if (userAudioRef.current) {
              userAudioRef.current.pause();
              setIsPlayingUserAudio(false);
          } 
      } catch (e) { alert("无法访问麦克风。请确保已授予权限并在 HTTPS/Localhost 环境下运行。"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };
  
  const handleCheck = async () => {
      if (!data.draftInput || !data.draftInput.trim() || !onOptimize) return;
      setIsOptimizing(true);
      try { await onOptimize(data.draftInput); } finally { setIsOptimizing(false); }
  };

  const handleSaveEdit = () => {
      onUpdate('content', editValue);
      setIsEditing(false);
  };

  const handleCancelEdit = () => {
      setEditValue(data.content);
      setIsEditing(false);
  };

  const handlePlayUserRecording = () => {
      if (isPlayingUserAudio) {
          userAudioRef.current?.pause();
          setIsPlayingUserAudio(false);
          return;
      }

      if (!evalResult?.audioBlob) return;

      const url = URL.createObjectURL(evalResult.audioBlob);
      const audio = new Audio(url);
      userAudioRef.current = audio;
      
      audio.onended = () => {
          setIsPlayingUserAudio(false);
          URL.revokeObjectURL(url);
      };
      
      audio.play();
      setIsPlayingUserAudio(true);
  };

  const handleDownloadAudio = async () => {
      if (!data.content) return;
      setIsDownloading(true);
      try {
          const pcm = await generateSpeech(data.content, voiceId);
          const blob = createWavBlob(pcm);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `Sentence_${index + 1}.wav`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
      } catch (e) {
          alert("下载失败，请重试");
      } finally {
          setIsDownloading(false);
      }
  };

  const toggleInputRecording = () => {
      if (isInputRecording) {
          recognitionRef.current?.stop();
          setIsInputRecording(false);
      } else {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (!SpeechRecognition) {
              alert("Your browser does not support Speech Recognition. Please try Chrome or Edge.");
              return;
          }

          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US'; // Default to English for practice

          // Store initial text to append to
          // Note: This simple approach appends to the end.
          const initialText = data.draftInput || "";
          
          recognition.onresult = (event: any) => {
              let sessionFullText = "";
              for (let i = 0; i < event.results.length; i++) {
                  sessionFullText += event.results[i][0].transcript;
              }
              
              // We reconstruct the full text: Original + Space + New Speech
              const spacer = (initialText && !initialText.endsWith(' ')) ? " " : "";
              onUpdate('draftInput', initialText + spacer + sessionFullText);
          };

          recognition.onstart = () => {
              setIsInputRecording(true);
          };

          recognition.onend = () => {
              setIsInputRecording(false);
          };
          
          recognition.onerror = (event: any) => {
              console.error("Speech Recognition Error", event.error);
              setIsInputRecording(false);
          };

          recognition.start();
          recognitionRef.current = recognition;
      }
  };

  const renderHighlightedText = () => {
    if (!data.content) return <span className="text-fg-sub italic font-medium animate-pulse flex items-center gap-2"><Sparkles className="w-4 h-4"/> AI 正在精心构思...</span>;
    
    const coreNouns = data.coreNouns || [];
    const formulaPhrases = data.patterns || []; 
    const usedFormula = data.formulaId ? SENTENCE_FORMULAS.find(f => f.id === data.formulaId) : null;
    let formulaSkeletons: string[] = [...formulaPhrases];
    if (usedFormula) {
        usedFormula.skeleton.forEach(s => {
            const segments = s.split(/\.{3,}/).map(seg => seg.trim()).filter(seg => seg.length > 1);
            formulaSkeletons.push(...segments);
        });
    }
    formulaSkeletons = [...new Set(formulaSkeletons)];

    const rawSentences = data.content.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [data.content];
    const lines: string[] = [];
    let buffer = "";
    
    rawSentences.forEach((sent) => {
        const s = sent.trim();
        if (!s) return;
        if (buffer) {
            lines.push(buffer + " " + s);
            buffer = "";
        } else {
            if (s.length < 60) { 
                buffer = s;
            } else {
                lines.push(s);
            }
        }
    });
    if (buffer) lines.push(buffer);

    const renderLine = (lineText: string) => {
        let parts: { text: string, type: 'normal' | 'noun' | 'formula' }[] = [{ text: lineText, type: 'normal' }];
        
        const applyHighlight = (searchTerms: string[], type: 'noun' | 'formula') => {
            if (searchTerms.length === 0) return;
            const pGroup = searchTerms.map(p => escapeRegExp(p)).join('|');
            const patternStr = `\\b(${pGroup})\\b`;
            const regex = new RegExp(patternStr, 'gi');
            
            const newParts: typeof parts = [];
            parts.forEach(part => {
                if (part.type !== 'normal') { newParts.push(part); return; }
                const split = part.text.split(regex);
                split.forEach(s => {
                    if (!s) return;
                    const isMatch = searchTerms.some(term => s.toLowerCase().includes(term.toLowerCase()));
                    newParts.push({ text: s, type: isMatch ? type : 'normal' });
                });
            });
            parts = newParts;
        };

        applyHighlight(coreNouns, 'noun');
        applyHighlight(formulaSkeletons, 'formula');

        return parts.map((part, i) => {
            const baseClass = "px-[2px] rounded-[4px] mx-0 box-decoration-clone inline";
            if (part.type === 'formula') return <span key={i} className={`${baseClass} text-fg-main font-bold border-b-2 border-dashed border-gray-300`}>{part.text}</span>;
            if (part.type === 'noun') return <span key={i} className={`${baseClass} text-sky-600 font-extrabold bg-sky-50 border-b-2 border-sky-200`}>{part.text}</span>;
            return <span key={i}>{part.text}</span>;
        });
    };

    return (
        <div className="text-lg text-fg-main font-bold tracking-wide text-left break-words">
            {lines.map((line, idx) => (
                <span key={idx} className="inline md:block leading-relaxed md:mb-4">
                    {renderLine(line)}
                    <span className="md:hidden"> </span>
                </span>
            ))}
        </div>
    );
  };

  const renderScoreBar = (label: string, score: number, colorClass: string) => (
      <div className="flex items-center gap-2 text-xs w-full font-bold">
          <span className="w-12 text-fg-sub">{label}</span>
          <div className="flex-1 h-3 bg-gray-200/20 rounded-full overflow-hidden border border-border">
              <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${score}%` }}></div>
          </div>
          <span className="w-6 text-right text-fg-main">{score}</span>
      </div>
  );

  const displayQuestion = (data.question || "").replace(/^[^:]+:\s*/, '');

  return (
    <div className={`rounded-3xl p-6 sm:p-8 transition-all duration-300 relative group/card ${cardStyle}`}>
      
      <div className="flex items-start gap-4 mb-6 pb-6 border-b-2 border-dashed border-border/60">
          <div className="mt-1">
              <button 
                  onClick={() => onGlobalPlay(questionAudioId, displayQuestion)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlayingQuestion ? 'bg-duo-blue text-white' : 'bg-bg-input text-duo-blue hover:bg-duo-blue/10'}`}
              >
                  {isLoadingQuestion ? <Loader2 className="w-5 h-5 animate-spin"/> : <Volume2 className="w-5 h-5"/>}
              </button>
          </div>
          <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${data.questionPart === 'Part 1' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {data.questionPart}
                  </span>
                  {data.questionSource && (
                      <span className="text-[10px] font-bold text-fg-muted bg-bg-input px-2 py-0.5 rounded">
                          {data.questionSource}
                      </span>
                  )}
              </div>
              <h3 className="text-lg font-black text-fg-main leading-tight">{displayQuestion}</h3>
          </div>
      </div>

      <div className="space-y-6">
        
        <div className="flex gap-4 items-start">
            <div className="flex-1 relative group/input">
                <textarea
                    value={data.draftInput || ""}
                    onChange={(e) => onUpdate('draftInput', e.target.value)}
                    placeholder={`Speaking or writing your answer... (Chinese or English)`}
                    className="w-full bg-bg-input border-2 border-transparent focus:border-duo-blue/30 p-4 pr-12 focus:ring-4 focus:ring-duo-blue/10 resize-none placeholder:text-fg-sub/60 placeholder:font-bold leading-relaxed text-fg-main text-lg font-bold transition-all rounded-2xl outline-none"
                    rows={data.draftInput ? Math.max(2, data.draftInput.split('\n').length) : 2}
                />
                <button 
                    onClick={toggleInputRecording}
                    className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all shadow-sm flex items-center justify-center
                        ${isInputRecording ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' : 'bg-white text-gray-400 hover:text-duo-blue border border-gray-200'}
                    `}
                    title="Speak Answer"
                >
                    {isInputRecording ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                </button>
            </div>

            <div className="flex flex-col gap-2 shrink-0 pt-0.5">
                 <button 
                    onClick={handleCheck}
                    disabled={!data.draftInput || !data.draftInput.trim() || isOptimizing}
                    className="w-12 h-12 rounded-2xl bg-bg-card hover:bg-green-500/10 text-gray-400 hover:text-duo-green flex items-center justify-center transition-all border-2 border-border border-b-4 active:border-b-2 active:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                    title="语法检查与润色"
                >
                    {isOptimizing ? <Loader2 className="w-6 h-6 animate-spin"/> : <Check className="w-6 h-6 stroke-[3]"/>}
                </button>
                <button 
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-12 h-12 rounded-2xl bg-duo-blue hover:bg-duo-blueDark text-white flex items-center justify-center transition-all border-b-4 border-duo-blueDark active:border-b-0 active:translate-y-[4px] disabled:opacity-50 shadow-sm"
                    title="AI 生成"
                >
                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin"/> : <Sparkles className="w-6 h-6 fill-white/20"/>}
                </button>
            </div>
        </div>

        <div className={`relative rounded-3xl transition-all duration-500 overflow-hidden ${isFinalized ? 'p-1' : 'h-0 opacity-0'}`}>
            {isFinalized && (
                <>
                    {isEditing ? (
                        <div className="animate-fade-in">
                            <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full bg-bg-input border-2 border-duo-blue/50 rounded-2xl p-4 text-lg font-bold text-fg-main focus:ring-4 focus:ring-duo-blue/10 outline-none resize-none leading-relaxed"
                                rows={Math.max(3, editValue.split('\n').length)}
                                autoFocus
                            />
                            <div className="flex gap-3 mt-3 justify-end">
                                <button onClick={handleCancelEdit} className="px-4 py-2 rounded-xl text-xs font-bold text-fg-sub bg-bg-input hover:bg-bg-hover flex items-center gap-1.5 transition-colors"><Undo2 className="w-3.5 h-3.5"/> 取消</button>
                                <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-duo-green hover:bg-green-500 border-b-4 border-duo-greenDark active:border-b-0 active:translate-y-[2px] flex items-center gap-1.5 transition-all"><Save className="w-3.5 h-3.5"/> 保存修改</button>
                            </div>
                        </div>
                    ) : (
                        renderHighlightedText()
                    )}
                    
                    {!isEditing && (
                        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t-2 border-dashed border-border/50">
                             <button 
                                onClick={() => onGlobalPlay(contentAudioId, data.content)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border-b-4 active:border-b-0 active:translate-y-[4px]
                                    ${isPlayingContent ? 'bg-duo-blue text-white border-duo-blueDark' : 'bg-bg-card text-fg-muted border-border hover:bg-bg-hover'}`}
                            >
                                {isLoadingContent ? <Loader2 className="w-4 h-4 animate-spin"/> : isPlayingContent ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current"/>}
                                {isLoadingContent ? 'LOADING' : isPlayingContent ? 'PLAYING' : 'LISTEN'}
                             </button>

                             <button 
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isEvaluating}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border-b-4 active:border-b-0 active:translate-y-[4px]
                                    ${isRecording ? 'bg-duo-red text-white border-duo-redDark animate-pulse' : 'bg-bg-card text-fg-muted border-border hover:bg-bg-hover'}`}
                            >
                                {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin"/> : isRecording ? <StopCircle className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
                                {isRecording ? 'STOP' : 'SPEAK'}
                            </button>

                            <button onClick={handleDownloadAudio} disabled={isDownloading} className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border-b-4 active:border-b-0 active:translate-y-[4px] bg-bg-card text-fg-muted border-border hover:bg-bg-hover disabled:opacity-50">
                                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                            </button>

                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border-b-4 active:border-b-0 active:translate-y-[4px] bg-bg-card text-fg-muted border-border hover:bg-bg-hover ml-auto sm:ml-0">
                                <Edit3 className="w-4 h-4"/> EDIT
                            </button>
                        </div>
                    )}
                </>
            )}
            
            {evalResult && (
                <div className="mt-6 bg-bg-card rounded-3xl p-6 animate-slide-up border-2 border-border shadow-xl relative overflow-hidden">
                    <div className="flex gap-5 items-start mb-6">
                        <div className={`flex flex-col items-center justify-center w-16 h-16 shrink-0 rounded-2xl border-b-4 ${evalResult.score > 80 ? 'bg-duo-green border-duo-greenDark text-white' : 'bg-duo-orange border-duo-orangeDark text-white'}`}>
                            <span className="text-3xl font-black">{evalResult.score}</span>
                        </div>
                        <div className="flex-1 space-y-3 pt-1">
                            {renderScoreBar("准确度", evalResult.accuracyScore || 0, "bg-duo-blue")}
                            {renderScoreBar("流利度", evalResult.fluencyScore || 0, "bg-duo-purple")}
                            {renderScoreBar("完整度", evalResult.integrityScore || 0, "bg-duo-green")}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setEvalResult(null)} className="p-2 hover:bg-bg-hover rounded-full text-fg-sub transition-colors self-end"><X className="w-5 h-5"/></button>
                            {evalResult.audioBlob && (
                                <button 
                                    onClick={handlePlayUserRecording}
                                    className={`p-2 rounded-xl transition-colors flex items-center justify-center ${isPlayingUserAudio ? 'bg-duo-green text-white animate-pulse' : 'bg-duo-blue/10 hover:bg-duo-blue/20 text-duo-blue'}`}
                                    title="Play User Recording"
                                >
                                    {isPlayingUserAudio ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-bg-input rounded-2xl p-4 border-2 border-border">
                         <div className="text-sm font-bold text-fg-main mb-3 leading-relaxed">{evalResult.feedback}</div>
                         {evalResult.mistakes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t-2 border-border border-dashed">
                                <span className="text-[10px] text-fg-sub font-black uppercase tracking-wider py-1">错词 (点击听音):</span>
                                {evalResult.mistakes.map((m, i) => {
                                    const wordAudioId = `mistake-${index}-${i}-${m}`;
                                    const isPlayingWord = globalPlayingId === wordAudioId;
                                    const isLoadingWord = isGlobalLoading && isPlayingWord;
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => onGlobalPlay(wordAudioId, m)}
                                            disabled={isGlobalLoading && !isPlayingWord}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all border border-b-2 active:border-b
                                                ${isPlayingWord 
                                                    ? 'bg-duo-blue text-white border-duo-blueDark ring-2 ring-duo-blue/20' 
                                                    : 'bg-bg-card text-duo-red border-duo-red/20 hover:bg-duo-red/10 hover:border-duo-red/30'
                                                }`}
                                            title="Click to play pronunciation"
                                        >
                                            {isLoadingWord ? <Loader2 className="w-3 h-3 animate-spin"/> : <Volume2 className="w-3 h-3"/>}
                                            {m}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SentenceCard;
