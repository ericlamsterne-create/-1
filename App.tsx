
import React, { useState, useEffect, useRef } from 'react';
import SentenceCard from './components/SentenceCard';
import UserProfileModal from './components/UserProfileModal';
import { SentenceData, AccentType, Session, P2Session, DEFAULT_SENTENCE_TYPES, UserProfile, P2Result } from './types';
import { generateSingleSentence, generateStory, generateSpeech, createWavBlob, evaluatePronunciation, optimizeUserSentence } from './services/geminiService';
import { PHRASE_BANK } from './data/phraseBank';
import { exportHistoryToWord, importHistoryFromWord } from './services/documentService';
import { BookOpen, Check, History, X, Sparkles, Wand2, Pause, Play, Loader2, Settings, Download, Upload, Dices, FileUp, AlertCircle, Zap, Shield, Brain, Mic, StopCircle, Lightbulb, ArrowRight, ListMusic, Trash2 } from 'lucide-react';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from './data/voices';

const MAX_FREE_SESSIONS = 113; // Max capacity if unlocked
const FREE_USER_LIMIT = 6;     // Limit for users without code

const LegalModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 border border-zinc-700 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-green-500"/> 免责与用户协议</h2>
            <div className="overflow-y-auto pr-4 text-zinc-400 text-sm space-y-4 leading-relaxed custom-scrollbar">
                <p><strong>1. AI 生成内容免责声明</strong><br/>LinguaFlow 使用人工智能技术（Google Gemini API）生成内容。尽管我们致力于提供准确的辅助，但 AI 生成的语言、逻辑或事实可能存在误差。用户应自行判断生成内容的准确性，本应用不对因使用 AI 生成内容而导致的考试失分或其他损失承担责任。</p>
                <p><strong>2. 数据隐私与安全</strong><br/>本应用采用纯前端架构，您的学习记录（History）、个人资料（Profile）均存储在您设备的本地浏览器缓存（Local Storage）中，不会上传至任何中心化服务器。请注意清理浏览器缓存可能导致数据丢失，建议定期使用“备份”功能下载 .docx 文档。</p>
                <p><strong>3. 麦克风权限使用</strong><br/>应用仅在您主动点击“录音/评测”或“训练”时调用麦克风权限。音频数据会实时发送至 Google Gemini API 进行分析，处理完毕后即刻销毁，不会被本应用永久存储或用于其他用途。</p>
                <p><strong>4. 知识产权</strong><br/>本应用提供的核心词组库及设计受版权保护。用户不得通过爬虫、反编译等手段获取源代码或原始数据用于商业用途。</p>
                <p><strong>5. 服务变更与终止</strong><br/>作为一款基于第三方 API 的工具，若 Google API 服务策略变更，本应用的部分功能可能会受到影响。开发者保留随时更新或调整服务内容的权利。</p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
                <button onClick={onClose} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">我已阅读并知晓</button>
            </div>
        </div>
    </div>
);

interface BatchItem {
    id: string;
    text: string;
    type: string;
    question?: string;
    logic?: string;
    corePhrase: string;
    patterns: string[];
}

const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  
  // -- Critical History Persistence Logic --
  // Use lazy initialization for state to prevent overwriting localStorage with defaults on initial render
  const [history, setHistory] = useState<Session[]>(() => {
      try {
          const saved = localStorage.getItem('linguaHistory');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [p2History, setP2History] = useState<P2Session[]>(() => {
      try {
          const saved = localStorage.getItem('linguaP2History');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      try {
          const saved = localStorage.getItem('linguaUserProfile');
          return saved ? JSON.parse(saved) : {
              name: "", role: "", interests: "", people: "", goals: "",
              targetScoreSpeaking: "6.5", targetScoreWriting: "6.5", targetScore: "6.5",
              favoriteTopics: "", importantExperiences: "", invitationCode: "", inspiration: "",
              preferredAccent: AccentType.US, preferredVoiceId: 'us_duo',
              playbackSpeed: 1.0, useGoldenFormulas: true
          };
      } catch (e) {
          return {
              name: "", role: "", interests: "", people: "", goals: "",
              targetScoreSpeaking: "6.5", targetScoreWriting: "6.5", targetScore: "6.5",
              favoriteTopics: "", importantExperiences: "", invitationCode: "", inspiration: "",
              preferredAccent: AccentType.US, preferredVoiceId: 'us_duo',
              playbackSpeed: 1.0, useGoldenFormulas: true
          };
      }
  });
  const [usedPhraseIds, setUsedPhraseIds] = useState<number[]>(() => {
      try {
          const saved = localStorage.getItem('linguaUsedPhraseIds');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [currentIndex, setCurrentIndex] = useState<number>(-1); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<'sentences' | 'p2'>('sentences');
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Batch Listen State
  const [showBatchPlayer, setShowBatchPlayer] = useState(false);
  const [batchPlaylist, setBatchPlaylist] = useState<BatchItem[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  // Removed local playbackSpeed; utilizing userProfile.playbackSpeed instead
  const batchListRef = useRef<HTMLDivElement>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);

  // Story Gen
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [storyResult, setStoryResult] = useState<P2Result | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  
  // P2 Audio/Eval State
  const [isP2Recording, setIsP2Recording] = useState(false);
  const [p2EvalResult, setP2EvalResult] = useState<any>(null);
  const p2MediaRecorderRef = useRef<MediaRecorder | null>(null);
  const p2ChunksRef = useRef<BlobPart[]>([]);

  // Global Audio Controller (Using HTML5 Audio for pitch preservation)
  const [globalPlayingId, setGlobalPlayingId] = useState<string | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const isBatchPlayingRef = useRef(false);
  const playSessionRef = useRef<number>(0); 

  const [draftCorePhrase, setDraftCorePhrase] = useState("");
  const [draftExampleSentence, setDraftExampleSentence] = useState<string | null>(null); 
  const [draftSentences, setDraftSentences] = useState<SentenceData[]>([
      { type: DEFAULT_SENTENCE_TYPES[0], content: "", draftInput: "" },
      { type: DEFAULT_SENTENCE_TYPES[1], content: "", draftInput: "" },
      { type: DEFAULT_SENTENCE_TYPES[2], content: "", draftInput: "" }
  ]);
  const [isGeneratingMap, setIsGeneratingMap] = useState<{[key: number]: boolean}>({});

  // Sync to LocalStorage (Persist changes)
  useEffect(() => { localStorage.setItem('linguaHistory', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('linguaP2History', JSON.stringify(p2History)); }, [p2History]);
  useEffect(() => { localStorage.setItem('linguaUserProfile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('linguaUsedPhraseIds', JSON.stringify(usedPhraseIds)); }, [usedPhraseIds]);

  // Update active playback speed dynamically if audio is playing
  useEffect(() => {
      if (globalAudioRef.current) {
          globalAudioRef.current.playbackRate = userProfile.playbackSpeed;
      }
  }, [userProfile.playbackSpeed]);

  // Auto-scroll batch player
  useEffect(() => {
      if (showBatchPlayer && batchListRef.current) {
          const activeEl = batchListRef.current.children[currentBatchIndex] as HTMLElement;
          if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentBatchIndex, showBatchPlayer]);

  const getVoiceName = () => {
      const allVoices = [...VOICES_US_PRESET, ...VOICES_UK_PRESET];
      const selected = allVoices.find(v => v.id === userProfile.preferredVoiceId);
      return selected?.geminiVoiceName || 'Zephyr';
  };

  const stopGlobalAudio = () => {
      playSessionRef.current++; // Invalidate pending async plays
      
      if (globalAudioRef.current) {
          globalAudioRef.current.pause();
          globalAudioRef.current.src = "";
          globalAudioRef.current = null;
      }
      
      setGlobalPlayingId(null);
      setIsGlobalLoading(false);
      isBatchPlayingRef.current = false;
  };

  const playAudioTrack = async (id: string, text: string) => {
      if (globalPlayingId === id) {
          stopGlobalAudio();
          return;
      }
      stopGlobalAudio();
      
      const currentSession = playSessionRef.current;
      setGlobalPlayingId(id);
      setIsGlobalLoading(true);

      try {
          const cleanText = text.replace(/\{\{|}}/g, "");
          const pcmBuffer = await generateSpeech(cleanText, id.includes('topic') ? 'Zephyr' : getVoiceName());
          
          if (playSessionRef.current !== currentSession) return;

          // Convert PCM to Wav Blob to allow HTML5 Audio to handle pitch preservation
          const wavBlob = createWavBlob(pcmBuffer);
          const audioUrl = URL.createObjectURL(wavBlob);
          const audio = new Audio(audioUrl);
          
          audio.playbackRate = userProfile.playbackSpeed;
          audio.preservesPitch = true; // Essential for preventing chipmunk effect
          
          audio.onended = () => {
              if (globalPlayingId === id && !isBatchPlayingRef.current && playSessionRef.current === currentSession) {
                  setGlobalPlayingId(null);
                  URL.revokeObjectURL(audioUrl);
              }
          };
          audio.onerror = () => {
             setIsGlobalLoading(false);
             setGlobalPlayingId(null);
             URL.revokeObjectURL(audioUrl);
          };

          globalAudioRef.current = audio;
          await audio.play();
          setIsGlobalLoading(false);

      } catch (e) {
          console.error(e);
          if (playSessionRef.current === currentSession) {
              setGlobalPlayingId(null);
              setIsGlobalLoading(false);
          }
      }
  };

  const startBatchPlayback = async (startIndex: number = 0) => {
      if (batchPlaylist.length === 0) return;
      stopGlobalAudio();
      
      const currentSession = playSessionRef.current;
      isBatchPlayingRef.current = true;
      setGlobalPlayingId('BATCH_MODE');
      setIsGlobalLoading(true);
      
      for (let i = startIndex; i < batchPlaylist.length; i++) {
          if (!isBatchPlayingRef.current || playSessionRef.current !== currentSession) break;
          
          setCurrentBatchIndex(i);
          const item = batchPlaylist[i];
          
          await new Promise<void>(async (resolve) => {
              try {
                  setIsGlobalLoading(true);
                  const pcmBuffer = await generateSpeech(item.text, getVoiceName());
                  
                  if (playSessionRef.current !== currentSession) { resolve(); return; }
                  setIsGlobalLoading(false);

                  const wavBlob = createWavBlob(pcmBuffer);
                  const audioUrl = URL.createObjectURL(wavBlob);
                  const audio = new Audio(audioUrl);
                  
                  audio.playbackRate = userProfile.playbackSpeed;
                  audio.preservesPitch = true;
                  
                  audio.onended = () => {
                      URL.revokeObjectURL(audioUrl);
                      resolve();
                  };
                  
                  globalAudioRef.current = audio;
                  await audio.play();
              } catch { 
                  setIsGlobalLoading(false);
                  resolve(); 
              }
          });

          if (!isBatchPlayingRef.current || playSessionRef.current !== currentSession) break;

          // Short pause
          await new Promise(r => setTimeout(r, 1000));
      }
      
      if (playSessionRef.current === currentSession) {
        isBatchPlayingRef.current = false;
        setGlobalPlayingId(null);
        setIsGlobalLoading(false);
      }
  };

  const toggleBatchPlayback = () => {
      if (isBatchPlayingRef.current) {
          stopGlobalAudio();
      } else {
          startBatchPlayback(currentBatchIndex);
      }
  };

  const onBatchItemClick = (index: number) => {
      startBatchPlayback(index);
  };

  const setupBatch = () => {
      const selectedSessions = history.filter(h => selectedIds.has(h.id));
      const playlist: BatchItem[] = [];
      
      selectedSessions.forEach(session => {
          session.sentences.forEach((s, idx) => {
              if(s.content) {
                  playlist.push({
                      id: `${session.id}-${idx}`,
                      text: s.content,
                      type: s.type,
                      question: s.ieltsTopic,
                      logic: s.logic,
                      corePhrase: session.corePhrase,
                      patterns: s.patterns || []
                  });
              }
          });
      });
      
      setBatchPlaylist(playlist);
      setShowBatchPlayer(true);
      setShowHistoryModal(false);
      setCurrentBatchIndex(0);
  };

  // --- Logic ---

  const handleGenerateSingle = async (index: number) => {
    const context = isDraftMode ? draftSentences : history[currentIndex]?.sentences;
    if (!context) return;
    const corePhrase = isDraftMode ? draftCorePhrase : history[currentIndex]?.corePhrase;
    const targetItem = context[index];
    if (!targetItem) return;
    if (!corePhrase && isDraftMode) return alert("请先填写核心词组");

    const currentSessionFormulas = context
        .filter((s, i) => i !== index && s.formulaId)
        .map(s => s.formulaId!);

    setIsGeneratingMap(prev => ({ ...prev, [index]: true }));
    try {
        const result = await generateSingleSentence(
            corePhrase || "", 
            targetItem.type, 
            targetItem.draftInput || "", 
            userProfile,
            currentSessionFormulas
        );
        
        const updateState = (items: SentenceData[]) => {
            const newS = [...items];
            newS[index] = { 
                ...newS[index], 
                content: result.content, 
                patterns: result.patterns, 
                ieltsTopic: result.ieltsTopic, 
                logic: result.logic,
                formulaId: result.formulaId,
                questionSource: result.questionSource
            };
            return newS;
        };

        if (isDraftMode) {
             setDraftSentences(prev => updateState(prev));
        } else {
             setHistory(prev => {
                const newH = [...prev]; 
                if(newH[currentIndex]) newH[currentIndex].sentences = updateState(newH[currentIndex].sentences);
                return newH;
            });
        }
    } catch (e: any) { alert(e.message || "生成失败"); } finally { setIsGeneratingMap(prev => ({ ...prev, [index]: false })); }
  };
  
  // New handler for manual input optimization
  const handleOptimizeUserSentence = async (index: number, userText: string) => {
      const context = isDraftMode ? draftSentences : history[currentIndex]?.sentences;
      if (!context) return;
      const corePhrase = isDraftMode ? draftCorePhrase : history[currentIndex]?.corePhrase;
      const targetItem = context[index];
      if (!targetItem) return;

      try {
          const result = await optimizeUserSentence(userText, corePhrase || "", targetItem.type, userProfile);
          
          const updateState = (items: SentenceData[]) => {
            const newS = [...items];
            newS[index] = { 
                ...newS[index], 
                content: result.content, // This will be the polished version
                patterns: result.patterns, 
                ieltsTopic: result.ieltsTopic, 
                logic: result.logic,
                questionSource: result.questionSource
            };
            return newS;
        };

        if (isDraftMode) {
             setDraftSentences(prev => updateState(prev));
        } else {
             setHistory(prev => {
                const newH = [...prev]; 
                if(newH[currentIndex]) newH[currentIndex].sentences = updateState(newH[currentIndex].sentences);
                return newH;
            });
        }
      } catch (e: any) {
          alert(e.message || "优化失败");
      }
  };

  const handleUpdate = (idx: number, field: keyof SentenceData, value: string) => {
      if (isDraftMode) {
          setDraftSentences(prev => { const newS = [...prev]; newS[idx] = { ...newS[idx], [field]: value }; return newS; });
      } else {
          setHistory(prev => {
              if (!prev[currentIndex]) return prev;
              const newH = [...prev]; newH[currentIndex].sentences[idx] = { ...newH[currentIndex].sentences[idx], [field]: value }; return newH;
          });
      }
  };

  const handleRandomExamPhrases = () => {
      const available = PHRASE_BANK.filter(p => !usedPhraseIds.includes(p.id));
      if (available.length === 0) {
          if (window.confirm("所有词组已完成，是否重置？")) { setUsedPhraseIds([]); } return;
      }
      const item = available[Math.floor(Math.random() * available.length)];
      setDraftCorePhrase((item.phrases.length <= 4 ? item.phrases : [...item.phrases].sort(() => 0.5 - Math.random()).slice(0, 4)).join(", "));
      setDraftExampleSentence(item.en);
      setUsedPhraseIds(prev => [...prev, item.id]);
  };

  const finishDraft = () => {
      if (!draftCorePhrase) return alert("请填写核心词组");
      
      const isUnlimited = userProfile.invitationCode?.toLowerCase() === 'linguaflow666888';
      const maxLimit = isUnlimited ? MAX_FREE_SESSIONS : FREE_USER_LIMIT;

      if (history.length >= maxLimit) {
          setShowProfileModal(true);
          return alert(`免费额度已满 (${FREE_USER_LIMIT}组句子)。\n请输入邀请码解锁无限使用权。`);
      }

      // Save draftExampleSentence to the session
      const newSession: Session = { 
          id: Date.now().toString(), 
          timestamp: Date.now(), 
          corePhrase: draftCorePhrase, 
          exampleSentence: draftExampleSentence || undefined, // Persistent example sentence
          sentences: draftSentences, 
          userAudios: [] 
      };
      setHistory([...history, newSession]);
      setDraftCorePhrase(""); 
      setDraftExampleSentence(null); 
      setDraftSentences([
          { type: DEFAULT_SENTENCE_TYPES[0], content: "", draftInput: "" },
          { type: DEFAULT_SENTENCE_TYPES[1], content: "", draftInput: "" },
          { type: DEFAULT_SENTENCE_TYPES[2], content: "", draftInput: "" }
      ]);
      setCurrentIndex(-1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateStory = async () => {
      if (selectedIds.size === 0) return;
      setIsGeneratingStory(true);
      try {
          const selectedSessions = history.filter(h => selectedIds.has(h.id));
          const result = await generateStory(
              selectedSessions.map(h => ({ corePhrase: h.corePhrase, sentences: h.sentences.map(s => s.content) })), 
              userProfile
          );
          setStoryResult(result);
          
          const newP2: P2Session = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              topic: result.title,
              content: result.content,
              logic: result.logic,
              corePhrases: selectedSessions.map(s => s.corePhrase)
          };
          setP2History(prev => [newP2, ...prev]);
          setShowHistoryModal(false);
      } catch (e: any) { alert(e.message || "生成失败"); } finally { setIsGeneratingStory(false); }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string, type: 'sentence' | 'p2') => {
    e.stopPropagation();
    if (window.confirm("确定要删除这条记录吗？(此操作不可恢复)")) {
        if (type === 'sentence') {
            setHistory(prev => {
                // If deleting the currently viewed session, switch to draft mode
                if (currentIndex !== -1 && prev[currentIndex]?.id === id) {
                    setCurrentIndex(-1);
                } else if (currentIndex !== -1) {
                    // If deleting a session before the current one, the index needs to shift down
                    const deletedIndex = prev.findIndex(h => h.id === id);
                    if (deletedIndex !== -1 && deletedIndex < currentIndex) {
                        setCurrentIndex(currentIndex - 1);
                    }
                }
                return prev.filter(h => h.id !== id);
            });
        } else {
            setP2History(prev => prev.filter(p => p.id !== id));
        }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const { sessions, p2Sessions } = await importHistoryFromWord(file, history);
          setHistory(sessions);
          if (p2Sessions && p2Sessions.length > 0) {
              setP2History(prev => [...p2Sessions, ...prev]);
          }
          alert(`成功导入 ${sessions.length} 条句子记录, ${p2Sessions?.length || 0} 条P2故事`);
          setShowHistoryModal(false);
      } catch (err: any) {
          alert("导入失败: " + err.message);
      }
      e.target.value = '';
  };

  const toggleP2Record = async () => {
      if (isP2Recording) {
          p2MediaRecorderRef.current?.stop();
      } else {
          if (!storyResult?.content) return;
          stopGlobalAudio();
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              p2MediaRecorderRef.current = mediaRecorder;
              p2ChunksRef.current = [];
              mediaRecorder.ondataavailable = (e) => p2ChunksRef.current.push(e.data);
              mediaRecorder.onstop = async () => {
                  const blob = new Blob(p2ChunksRef.current, { type: 'audio/webm' });
                  setIsP2Recording(false);
                  try {
                      setP2EvalResult(null); 
                      const result = await evaluatePronunciation(blob, storyResult.content, userProfile.preferredAccent);
                      setP2EvalResult(result);
                  } catch(e) { console.error(e); }
                  stream.getTracks().forEach(t => t.stop());
              };
              mediaRecorder.start();
              setIsP2Recording(true);
          } catch(e) {
              alert("无法访问麦克风");
          }
      }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderExampleSentence = () => {
      const sentence = isDraftMode ? draftExampleSentence : activeSession?.exampleSentence;
      const phrase = isDraftMode ? draftCorePhrase : activeSession?.corePhrase;
      
      if (!sentence || !phrase) return sentence;
      
      const phrases = phrase.split(/[,，]+/).map(p => p.trim()).filter(Boolean);
      if (phrases.length === 0) return sentence;

      const pGroup = phrases.map(p => escapeRegExp(p)).join('|');
      const regex = new RegExp(`(${pGroup})`, 'gi');
      const parts = sentence.split(regex);

      return (
          <span>
              {parts.map((part, i) => 
                  regex.test(part) ? <span key={i} className="text-zinc-300 bg-zinc-700 font-bold px-1.5 rounded">{part}</span> : part
              )}
          </span>
      );
  };

  const renderBatchContent = (item: BatchItem) => {
      if (!item.corePhrase || !item.text) return item.text;
      const phrases = item.corePhrase.split(/[,，]+/).map(p => p.trim()).filter(Boolean);
      const patterns = item.patterns || [];
      
      let parts: { text: string, type: 'normal' | 'core' | 'pattern' }[] = [{ text: item.text, type: 'normal' }];

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
                     if (type === 'core') return s.toLowerCase().trim().startsWith(term.toLowerCase());
                     return s.toLowerCase().includes(term.toLowerCase());
                });
                newParts.push({ text: s, type: isMatch ? type : 'normal' });
            });
        });
        parts = newParts;
    };

    applyHighlight(phrases, 'core');
    applyHighlight(patterns, 'pattern');

    return (
        <div className="leading-relaxed">
            {parts.map((part, i) => {
                if (part.type === 'core') return <span key={i} className="font-bold text-green-400 bg-green-900/30 rounded px-1.5 py-0.5 border-b-2 border-green-600 shadow-[0_0_10px_rgba(74,222,128,0.2)]">{part.text}</span>;
                // Stronger blue highlight for patterns
                if (part.type === 'pattern') return <span key={i} className="text-blue-300 bg-blue-900/50 rounded px-1 font-bold border-b border-blue-500/50">{part.text}</span>;
                return <span key={i}>{part.text}</span>;
            })}
        </div>
    );
  };

  const renderP2Content = (text: string, corePhrases: string[] = []) => {
      const sentences = text.split(/(?<=[.!?])\s+/);

      return (
          <div className="space-y-4">
              {sentences.map((sentence, sIdx) => {
                  if(!sentence.trim()) return null;
                  const parts = sentence.split(/(\{\{.*?\}\})/g);
                  return (
                      <p key={sIdx} className="leading-relaxed text-lg">
                          {parts.map((part, i) => {
                              if (part.startsWith('{{') && part.endsWith('}}')) {
                                  return <span key={i} className="text-blue-300 bg-blue-900/30 font-bold rounded px-1 border-b border-blue-500/30 mx-1">{part.slice(2, -2)}</span>;
                              }
                              if (corePhrases.length > 0) {
                                  const pGroup = corePhrases.map(p => escapeRegExp(p)).join('|');
                                  const phraseRegex = new RegExp(`(${pGroup})`, 'gi');
                                  const subParts = part.split(phraseRegex);
                                  return (
                                      <span key={i}>
                                          {subParts.map((sub, j) => 
                                              phraseRegex.test(sub) ? 
                                              <span key={j} className="font-bold text-green-400 bg-green-900/30 rounded px-1 border-b border-green-600">{sub}</span> 
                                              : sub
                                          )}
                                      </span>
                                  );
                              }
                              return <span key={i}>{part}</span>;
                          })}
                      </p>
                  )
              })}
          </div>
      );
  };

  const isDraftMode = currentIndex === -1;
  const activeSession = !isDraftMode ? history[currentIndex] : null;

  if (!hasEntered) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 overflow-hidden relative">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>
         
         <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8">
                <div>
                   <h1 className="text-5xl font-black text-white mb-4 tracking-tight flex items-center gap-4">
                       <BookOpen className="w-12 h-12 text-green-500" /> LinguaFlow
                   </h1>
                   <p className="text-2xl font-bold text-green-400">核心词组驱动，高效搭建专属雅思语料库</p>
                </div>

                <div className="grid gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                        <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> 告别学习碎片化</h3>
                        <ul className="space-y-2 text-zinc-400 text-sm">
                            <li className="flex gap-2"><X className="w-4 h-4 text-red-500 shrink-0"/> 传统模板痕迹重，考官秒识破，分数低</li>
                            <li className="flex gap-2"><X className="w-4 h-4 text-red-500 shrink-0"/> 网上素材千篇一律，生硬难背，易忘</li>
                            <li className="flex gap-2"><X className="w-4 h-4 text-red-500 shrink-0"/> 自己造句语法错误多，中式英语尴尬</li>
                            <li className="flex gap-2"><X className="w-4 h-4 text-red-500 shrink-0"/> 查词/造句/纠音/背诵切换繁琐，效率低下</li>
                        </ul>
                    </div>
                    
                    <div className="bg-zinc-900 border border-green-900/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(74,222,128,0.1)]">
                         <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2"><Shield className="w-5 h-5"/> 雅思口写全打通</h3>
                         <ul className="space-y-3 text-zinc-300 text-sm">
                            <li className="flex gap-2"><Zap className="w-4 h-4 text-green-500 shrink-0"/> 核心词组造句：利用精选核心词组搭配公式化句式构建雅思语料库</li>
                            <li className="flex gap-2"><Brain className="w-4 h-4 text-green-500 shrink-0"/> AI 个性化生成：结合身份经历生成专属答案，拒绝千篇一律</li>
                            <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0"/> 全能辅助：自动批改、发音评测、同步当季口写题库</li>
                            <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0"/> 雅思口语作文穿通学习，每个语料在考场上都有效</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900 p-10 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col justify-center h-full">
               
               <button 
                  onClick={async () => {
                      if (!hasAgreed) { alert("请先勾选同意用户协议"); return; }
                      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch(e) {}
                      setHasEntered(true);
                  }}
                  className={`w-full py-5 font-bold text-xl rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all 
                    ${hasAgreed ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30 hover:scale-[1.02]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
                  `}
               >
                   立即开启高效备考 <ArrowRight className="w-6 h-6"/>
               </button>
               
               <div className="mt-6 flex items-start gap-3 justify-center">
                   <input 
                      type="checkbox" 
                      id="agreement" 
                      checked={hasAgreed} 
                      onChange={(e) => setHasAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-green-600 focus:ring-green-500"
                   />
                   <label htmlFor="agreement" className="text-xs text-zinc-500 leading-snug select-none cursor-pointer">
                       我已阅读并同意 
                       <span 
                           className="text-green-500 hover:underline mx-1 font-bold" 
                           onClick={(e) => { e.preventDefault(); setShowLegalModal(true); }}
                       >
                           《免责与用户协议》
                       </span>
                       <br/>并授权开启麦克风权限以使用口语评测功能。
                   </label>
               </div>
            </div>
         </div>
         
         {showLegalModal && <LegalModal onClose={() => setShowLegalModal(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 font-sans selection:bg-green-900 selection:text-green-100 animate-in fade-in relative w-full overflow-x-hidden">
      
      {isDragOver && (
          <div className="fixed inset-0 z-50 bg-green-600/20 backdrop-blur-sm border-4 border-dashed border-green-500 flex items-center justify-center pointer-events-none">
              <div className="bg-zinc-950 p-8 rounded-3xl border border-green-500 shadow-2xl flex flex-col items-center">
                  <FileUp className="w-16 h-16 text-green-500 mb-4 animate-bounce"/>
                  <h3 className="text-2xl font-bold text-white">释放以导入备份</h3>
              </div>
          </div>
      )}

      {pendingImportFile && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-700 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mb-4 mx-auto"/>
                  <h3 className="text-lg font-bold text-white mb-2">导入备份</h3>
                  <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 text-sm mb-6">{pendingImportFile.name}</div>
                  <div className="flex gap-3"><button onClick={() => setPendingImportFile(null)} className="flex-1 py-3 bg-zinc-800 rounded-xl">取消</button><button onClick={() => { importHistoryFromWord(pendingImportFile, history).then(({sessions, p2Sessions}) => { setHistory(sessions); if(p2Sessions?.length) setP2History(prev => [...p2Sessions, ...prev]); setPendingImportFile(null); }); }} className="flex-1 py-3 bg-green-600 rounded-xl">确认</button></div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white cursor-pointer" onClick={() => setCurrentIndex(-1)}>
            <BookOpen className="w-6 h-6 text-green-500" /> LinguaFlow
          </div>
          <div className="flex items-center gap-4">
             <button id="settings-btn" onClick={() => setShowProfileModal(true)} className="p-2 text-zinc-400 hover:text-green-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2">
                <Settings className="w-5 h-5" /> <span className="text-sm hidden sm:block">设置</span>
             </button>
             <button id="history-btn" onClick={() => setShowHistoryModal(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2">
                <History className="w-5 h-5" /> <span className="text-sm hidden sm:block">历史</span>
             </button>
          </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="relative mb-8 text-center mt-6 px-2">
             <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
                <input 
                    id="core-phrase-input"
                    type="text" 
                    value={isDraftMode ? draftCorePhrase : activeSession?.corePhrase || ""}
                    onChange={(e) => isDraftMode && setDraftCorePhrase(e.target.value)}
                    disabled={!isDraftMode}
                    placeholder="输入核心词组..."
                    className={`flex-1 text-center text-xl font-black bg-transparent border-b-2 border-zinc-800 p-2 focus:border-green-500 transition-colors ${!isDraftMode ? 'text-white' : 'text-green-400'} min-w-0`}
                />
                {isDraftMode && (
                     <button onClick={handleRandomExamPhrases} className="p-3 text-zinc-400 hover:text-green-400 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg shrink-0 active:scale-95 transition-transform">
                         <Dices className="w-6 h-6" />
                     </button>
                )}
            </div>
            {isDraftMode && draftExampleSentence && (
                 <div className="mt-4 bg-zinc-800/50 inline-block p-2 rounded-lg text-zinc-400 text-sm italic border border-zinc-700/50">
                     "{renderExampleSentence()}"
                 </div>
            )}
        </div>

        {isDraftMode ? (
             <div className="flex justify-center mb-8"><button onClick={finishDraft} className="px-10 py-3 bg-zinc-900 border border-green-900/50 rounded-full font-bold text-green-500 hover:text-green-400 flex items-center gap-2 shadow-lg"><Check className="w-5 h-5" /> 完成并存档</button></div>
        ) : (
             <div className="flex justify-center mb-8"><button onClick={() => setCurrentIndex(-1)} className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-zinc-400 flex items-center gap-2"><BookOpen className="w-4 h-4" /> 返回新建</button></div>
        )}

        <div className="grid gap-6">
            {(isDraftMode ? draftSentences : (activeSession?.sentences || [])).map((data, idx) => (
                <div key={idx} id={idx === 0 ? "sentence-card-0" : undefined}>
                    <SentenceCard 
                        index={idx}
                        data={data as any} 
                        corePhrase={isDraftMode ? draftCorePhrase : activeSession?.corePhrase || ""}
                        onUpdate={(f, v) => handleUpdate(idx, f, v)}
                        onGenerate={() => handleGenerateSingle(idx)}
                        onOptimize={(text) => handleOptimizeUserSentence(idx, text)}
                        isGenerating={!!isGeneratingMap[idx]}
                        voiceId={userProfile.preferredVoiceId}
                        accent={userProfile.preferredAccent}
                        globalPlayingId={globalPlayingId}
                        isGlobalLoading={isGlobalLoading}
                        onGlobalPlay={playAudioTrack}
                    />
                </div>
            ))}
        </div>
      </main>
      
      {showProfileModal && <UserProfileModal initialProfile={userProfile} onSave={setUserProfile} onClose={() => setShowProfileModal(false)} />}
      
      {/* History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col">
                  <div className="flex justify-between mb-4 shrink-0">
                      <h2 className="text-xl font-bold text-white flex gap-2"><History className="w-5 h-5 text-green-500"/> 历史</h2>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }} className={`p-2 rounded-lg ${selectionMode ? 'bg-green-600' : 'text-zinc-500'}`}><Sparkles className="w-5 h-5"/></button>
                        <button onClick={() => setShowHistoryModal(false)}><X className="w-6 h-6 text-zinc-500"/></button>
                      </div>
                  </div>

                  <div className="flex gap-2 mb-4 shrink-0">
                      <button onClick={() => setHistoryTab('sentences')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${historyTab === 'sentences' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>P1 & P3 & W2</button>
                      <button onClick={() => setHistoryTab('p2')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${historyTab === 'p2' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>P2 Stories</button>
                  </div>

                  {historyTab === 'sentences' ? (
                      <>
                        <div className="flex gap-2 mb-4 shrink-0">
                            {selectionMode ? (
                                <button onClick={setupBatch} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white flex justify-center gap-2 items-center">
                                    <ListMusic className="w-3 h-3"/> 批量 Listen ({selectedIds.size})
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => exportHistoryToWord(history, p2History)} className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 flex justify-center gap-2"><Download className="w-3 h-3"/> 备份</button>
                                    <label className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 flex justify-center gap-2 cursor-pointer"><Upload className="w-3 h-3"/> 恢复 <input type="file" onChange={handleFileSelect} className="hidden" accept=".docx"/></label>
                                </>
                            )}
                        </div>
                        {selectionMode && <div className="mb-4 bg-zinc-900 p-3 rounded-lg flex justify-between items-center shrink-0"><span className="text-green-400 text-sm">已选: {selectedIds.size}</span><button disabled={selectedIds.size === 0 || isGeneratingStory} onClick={handleCreateStory} className="px-3 py-1 bg-green-600 rounded text-xs text-white flex gap-1 items-center">{isGeneratingStory?<Loader2 className="w-3 h-3 animate-spin"/>:<Wand2 className="w-3 h-3"/>} P2生成</button></div>}
                        <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {history.slice().reverse().map(s => (
                                <div key={s.id} className="flex gap-2 items-center">
                                    {selectionMode && <button onClick={() => { const newS = new Set(selectedIds); if(newS.has(s.id)) newS.delete(s.id); else newS.add(s.id); setSelectedIds(newS); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-3 ${selectedIds.has(s.id)?'bg-green-500 border-green-500':'border-zinc-700'}`}>{selectedIds.has(s.id)&&<Check className="w-3 h-3 text-black"/>}</button>}
                                    <div className="flex-1 relative group">
                                        <button 
                                            onClick={() => { if(!selectionMode) { setCurrentIndex(history.findIndex(h => h.id === s.id)); setShowHistoryModal(false); } }} 
                                            className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-left hover:border-zinc-600"
                                        >
                                            <div className="font-bold text-white text-sm">{s.corePhrase}</div>
                                            <div className="text-xs text-zinc-500">{new Date(s.timestamp).toLocaleDateString()}</div>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteSession(e, s.id, 'sentence')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex gap-2 mb-4 shrink-0">
                                <button onClick={() => exportHistoryToWord(history, p2History)} className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 flex justify-center gap-2"><Download className="w-3 h-3"/> 备份</button>
                                <label className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 flex justify-center gap-2 cursor-pointer"><Upload className="w-3 h-3"/> 恢复 <input type="file" onChange={handleFileSelect} className="hidden" accept=".docx"/></label>
                          </div>
                          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                            {p2History.length === 0 && <div className="text-zinc-600 text-center text-xs py-10">暂无 P2 记录</div>}
                            {p2History.map(p => (
                                <div key={p.id} className="relative group">
                                    <button onClick={() => { setStoryResult({ title: p.topic, content: p.content, logic: p.logic }); setShowHistoryModal(false); }} className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-left hover:border-zinc-600">
                                        <div className="font-bold text-white text-sm line-clamp-1">{p.topic}</div>
                                        <div className="text-xs text-zinc-500 flex justify-between mt-1"><span>{new Date(p.timestamp).toLocaleDateString()}</span> <span className="text-green-500">{p.corePhrases.length} phrases</span></div>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteSession(e, p.id, 'p2')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Batch Player Modal */}
      {showBatchPlayer && (
          <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col p-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-6 shrink-0">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><ListMusic className="w-5 h-5 text-green-500"/> 批量 Listen</h2>
                  <button onClick={() => { setShowBatchPlayer(false); stopGlobalAudio(); }} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 px-2" ref={batchListRef}>
                  {batchPlaylist.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-6 rounded-2xl border transition-all duration-500 cursor-pointer ${currentBatchIndex === idx ? 'bg-zinc-900 border-green-500/50 scale-100 shadow-xl shadow-green-900/10' : 'bg-zinc-900/30 border-zinc-800/50 scale-95 opacity-50 hover:opacity-80'}`}
                        onClick={() => onBatchItemClick(idx)}
                      >
                          <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded uppercase tracking-wide">{item.type}</span>
                          </div>
                          
                          {item.question && (
                             <div className="mb-3 text-xs text-zinc-400 font-medium border-l-2 border-zinc-700 pl-3 italic">
                                 {item.question}
                             </div>
                          )}
                          
                          <div className={`text-lg mb-3 ${currentBatchIndex === idx ? 'text-white' : 'text-zinc-400'}`}>
                              {renderBatchContent(item)}
                          </div>

                          {item.logic && (
                              <div className="bg-yellow-900/10 border border-yellow-900/20 p-2 rounded-lg flex items-start gap-2">
                                  <Lightbulb className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0"/>
                                  <span className="text-[10px] text-zinc-500 leading-tight">{item.logic}</span>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
              <div className="mt-6 shrink-0 flex justify-center">
                  <button 
                    onClick={toggleBatchPlayback} 
                    className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-full font-bold text-white shadow-lg shadow-green-900/30 flex items-center gap-2 transition-transform active:scale-95"
                  >
                      {isGlobalLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : isBatchPlayingRef.current ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
                      {isGlobalLoading ? 'Loading' : isBatchPlayingRef.current ? 'Pause' : 'Listen'}
                  </button>
              </div>
          </div>
      )}

      {/* P2 Result Modal */}
      {storyResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
                  <button onClick={() => { stopGlobalAudio(); setStoryResult(null); }} className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white z-10"><X className="w-5 h-5"/></button>
                  <div className="flex items-center gap-3 mb-6"><Sparkles className="w-6 h-6 text-green-500"/><h2 className="text-xl font-bold text-white line-clamp-1">{storyResult.title}</h2></div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                      <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-800/50 text-lg text-zinc-300 font-serif">
                          {renderP2Content(storyResult.content, history.filter(h => selectedIds.has(h.id)).map(h => h.corePhrase))}
                      </div>
                      
                      {storyResult.logic && (
                        <div className="bg-yellow-900/10 border border-yellow-900/30 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold text-sm uppercase"><Lightbulb className="w-4 h-4"/> 记忆思路 (Visual Logic)</div>
                            <div className="text-zinc-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{storyResult.logic}</div>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 flex gap-3 justify-center pt-4 border-t border-zinc-800">
                       <button onClick={() => playAudioTrack('p2-story', storyResult.content)} className={`px-6 py-3 rounded-xl font-bold flex gap-2 items-center transition-colors ${globalPlayingId === 'p2-story' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                           {isGlobalLoading && globalPlayingId === 'p2-story' ? <Loader2 className="w-4 h-4 animate-spin"/> : globalPlayingId === 'p2-story' ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>} Listen
                       </button>
                       <button onClick={toggleP2Record} className={`px-6 py-3 rounded-xl font-bold flex gap-2 items-center transition-colors ${isP2Recording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                           {isP2Recording ? <StopCircle className="w-4 h-4"/> : <Mic className="w-4 h-4"/>} Evaluate
                       </button>
                  </div>
                  {p2EvalResult && <div className="mt-4 bg-zinc-800 p-3 rounded-xl flex gap-3 items-center"><div className={`text-2xl font-black ${p2EvalResult.score>80?'text-green-500':'text-orange-500'}`}>{p2EvalResult.score}</div><div className="text-xs text-zinc-400">{p2EvalResult.feedback}</div></div>}
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
