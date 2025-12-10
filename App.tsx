import React, { useState, useEffect, useRef } from 'react';
import SentenceCard from './components/SentenceCard';
import AudioControls from './components/AudioControls';
import { SentenceData, AccentType, Session, UserAudio, DEFAULT_SENTENCE_TYPES } from './types';
import { generateSingleSentence, generateStory, generateSpeech, pcmToAudioBuffer } from './services/geminiService';
import { BookOpen, Check, History, X, Sparkles, Wand2, Pause, Play, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Data State
  const [history, setHistory] = useState<Session[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1); // -1 = New Draft Mode
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Story Generation State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [storyResult, setStoryResult] = useState<{ title: string, content: string } | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const storyAudioRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Custom Sentence Types State (Persisted)
  const [customTypes, setCustomTypes] = useState<string[]>(DEFAULT_SENTENCE_TYPES);

  // Draft State
  const [draftCorePhrase, setDraftCorePhrase] = useState("");
  const [draftUserAudios, setDraftUserAudios] = useState<UserAudio[]>([]);
  const [draftSentences, setDraftSentences] = useState<SentenceData[]>([
      { type: DEFAULT_SENTENCE_TYPES[0], content: "", draftInput: "" },
      { type: DEFAULT_SENTENCE_TYPES[1], content: "", draftInput: "" },
      { type: DEFAULT_SENTENCE_TYPES[2], content: "", draftInput: "" }
  ]);
  
  const [isGeneratingMap, setIsGeneratingMap] = useState<{[key: number]: boolean}>({});
  const [accent, setAccent] = useState<AccentType>(AccentType.US);

  useEffect(() => {
    const savedHistory = localStorage.getItem('linguaHistory');
    if (savedHistory) {
        try {
            const parsed = JSON.parse(savedHistory);
            const sanitized = Array.isArray(parsed) ? parsed.map((s: any) => ({
                ...s,
                userAudios: Array.isArray(s.userAudios) ? s.userAudios : (s.userMasterAudio ? [{ id: 'legacy', label: '我的声音', data: s.userMasterAudio }] : []),
                sentences: Array.isArray(s.sentences) ? s.sentences.map((sent: any) => ({
                    type: sent.type,
                    content: sent.content || "",
                    draftInput: sent.draftInput || "",
                    patterns: sent.patterns || [] 
                })) : []
            })) : [];
            setHistory(sanitized);
        } catch (e) {
            console.error("Failed to load history", e);
            setHistory([]);
        }
    }

    const savedTypes = localStorage.getItem('linguaCustomTypes');
    if (savedTypes) {
        try {
            const types = JSON.parse(savedTypes);
            if (Array.isArray(types) && types.length === 3) {
                setCustomTypes(types);
                setDraftSentences([
                    { type: types[0], content: "", draftInput: "" },
                    { type: types[1], content: "", draftInput: "" },
                    { type: types[2], content: "", draftInput: "" }
                ]);
            }
        } catch (e) {}
    }
  }, []);

  // Updated: Always save history when it changes, no login check needed
  useEffect(() => {
    localStorage.setItem('linguaHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
      localStorage.setItem('linguaCustomTypes', JSON.stringify(customTypes));
  }, [customTypes]);

  useEffect(() => {
      // Reset selection when modal closes
      if (!showHistoryModal) {
          setSelectionMode(false);
          setSelectedIds(new Set());
      }
  }, [showHistoryModal]);
  
  // Cleanup audio on story close
  useEffect(() => {
      if (!storyResult) {
          stopStoryAudio();
      }
  }, [storyResult]);

  const handleGenerateSingle = async (index: number) => {
    const context = isDraftMode ? draftSentences : history[currentIndex]?.sentences;
    if (!context) return;

    const corePhrase = isDraftMode ? draftCorePhrase : history[currentIndex]?.corePhrase;
    const targetItem = context[index];
    if (!targetItem) return;

    if (!corePhrase && isDraftMode) return alert("请先填写核心词组");

    setIsGeneratingMap(prev => ({ ...prev, [index]: true }));

    try {
        // Result now contains { content, patterns }
        const result = await generateSingleSentence(corePhrase || "", targetItem.type, targetItem.draftInput || "");
        
        if (isDraftMode) {
            setDraftSentences(prev => {
                const newS = [...prev];
                newS[index] = { ...newS[index], content: result.content, patterns: result.patterns };
                return newS;
            });
        } else {
             setHistory(prevHistory => {
                 const newH = [...prevHistory];
                 if (newH[currentIndex]) {
                     const sess = { ...newH[currentIndex] };
                     const sents = [...sess.sentences];
                     sents[index] = { ...sents[index], content: result.content, patterns: result.patterns };
                     sess.sentences = sents;
                     newH[currentIndex] = sess;
                 }
                 return newH;
             });
        }
    } catch (e) {
        console.error(e);
        alert("生成失败，请重试");
    } finally {
        setIsGeneratingMap(prev => ({ ...prev, [index]: false }));
    }
  };

  const isDraftMode = currentIndex === -1;
  const activeSession = !isDraftMode && history[currentIndex] ? history[currentIndex] : null;

  const currentCorePhraseDisplay = isDraftMode ? draftCorePhrase : activeSession?.corePhrase || "";
  const currentSentencesDisplay = isDraftMode ? draftSentences : activeSession?.sentences || [];
  const currentUserAudiosDisplay = isDraftMode ? draftUserAudios : activeSession?.userAudios || [];

  const handleUpdate = (idx: number, field: keyof SentenceData, value: string) => {
      if (isDraftMode) {
          setDraftSentences(prev => {
              const newS = [...prev];
              newS[idx] = { ...newS[idx], [field]: value };
              return newS;
          });
          
          if (field === 'type') {
              setCustomTypes(prev => {
                  const newTypes = [...prev];
                  newTypes[idx] = value;
                  return newTypes;
              });
          }
      } else {
          setHistory(prevHistory => {
              if (!prevHistory[currentIndex]) return prevHistory;
              const newH = [...prevHistory];
              const sess = { ...newH[currentIndex] };
              const sents = [...sess.sentences];
              sents[idx] = { ...sents[idx], [field]: value };
              sess.sentences = sents;
              newH[currentIndex] = sess;
              return newH;
          });

          if (field === 'type') {
              setCustomTypes(prev => {
                  const newTypes = [...prev];
                  newTypes[idx] = value;
                  return newTypes;
              });
          }
      }
  };

  const handleUpdateCorePhrase = (val: string) => {
      if (isDraftMode) setDraftCorePhrase(val);
  };

  const addUserAudio = (url: string, isProfile = false, settings = {}) => {
      const newAudio: UserAudio = {
          id: Date.now().toString(),
          label: isProfile ? '我的 AI 朗读分身' : `我的声音 ${currentUserAudiosDisplay.length + 1}`,
          data: url,
          isProfile,
          voiceSettings: isProfile ? settings as any : undefined
      };

      if (isDraftMode) {
          setDraftUserAudios(prev => [...prev, newAudio]);
      } else {
          setHistory(prevHistory => {
              if (!prevHistory[currentIndex]) return prevHistory;
              const newH = [...prevHistory];
              const currentAudios = newH[currentIndex].userAudios || [];
              newH[currentIndex] = { ...newH[currentIndex], userAudios: [...currentAudios, newAudio] };
              return newH;
          });
      }
  };

  const finishDraft = () => {
      if (!draftCorePhrase) return alert("请至少输入核心词组");
      
      const newSession: Session = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        corePhrase: draftCorePhrase,
        sentences: draftSentences,
        userAudios: draftUserAudios
      };
      
      const newHistory = [...history, newSession];
      setHistory(newHistory);
      
      setDraftCorePhrase("");
      setDraftUserAudios([]);
      setDraftSentences([
          { type: customTypes[0], content: "", draftInput: "" },
          { type: customTypes[1], content: "", draftInput: "" },
          { type: customTypes[2], content: "", draftInput: "" }
      ]);
      setCurrentIndex(-1);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert("卡片已保存至历史记录");
  };

  const groupHistoryByDate = () => {
      const groups: {[key: string]: Session[]} = {};
      history.slice().reverse().forEach(session => {
          const date = new Date(session.timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
          if (!groups[date]) groups[date] = [];
          groups[date].push(session);
      });
      return groups;
  };
  
  // Story Functions
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleCreateStory = async () => {
      if (selectedIds.size === 0) return;
      setIsGeneratingStory(true);
      
      const itemsToUse = history.filter(h => selectedIds.has(h.id)).map(h => ({
          corePhrase: h.corePhrase,
          sentences: h.sentences.map(s => s.content)
      }));
      
      try {
          const result = await generateStory(itemsToUse);
          setStoryResult(result);
          setShowHistoryModal(false);
      } catch (e) {
          alert("故事生成失败，请重试");
      } finally {
          setIsGeneratingStory(false);
      }
  };

  const stopStoryAudio = () => {
      if (storyAudioRef.current) {
          try { storyAudioRef.current.stop(); } catch(e) {}
          storyAudioRef.current = null;
      }
      setIsStoryPlaying(false);
  };

  const toggleStoryPlay = async () => {
      if (isStoryPlaying) {
          stopStoryAudio();
          return;
      }
      
      if (!storyResult) return;
      setIsStoryPlaying(true);
      
      try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const voice = accent === AccentType.US ? 'Zephyr' : 'Fenrir';
          const pcm = await generateSpeech(storyResult.content, voice);
          const buffer = pcmToAudioBuffer(pcm, ctx);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => setIsStoryPlaying(false);
          source.start(0);
          storyAudioRef.current = source;
      } catch (e) {
          console.error(e);
          setIsStoryPlaying(false);
          alert("播放失败");
      }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-48 font-sans selection:bg-green-900 selection:text-green-100">
      
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white cursor-pointer" onClick={() => setCurrentIndex(-1)}>
            <BookOpen className="w-6 h-6 text-green-500" /> LinguaFlow
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowHistoryModal(true)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
             >
                <History className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:block">历史记录</span>
             </button>
             {/* LogOut button removed */}
          </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="relative mb-8 text-center">
            <div className="flex-1 relative group max-w-xl mx-auto">
                <input 
                    type="text" 
                    value={currentCorePhraseDisplay}
                    onChange={(e) => handleUpdateCorePhrase(e.target.value)}
                    disabled={!isDraftMode}
                    placeholder="输入核心词组 (如: piece of cake)"
                    className={`w-full text-center text-3xl font-black bg-transparent border-b-2 border-zinc-800 p-2 focus:ring-0 focus:border-green-500 transition-colors placeholder:text-zinc-800
                        ${!isDraftMode ? 'text-white' : 'text-green-400'}
                    `}
                />
                <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                    {isDraftMode ? "新建卡片" : `查看历史 • ${activeSession ? new Date(activeSession.timestamp).toLocaleDateString() : ''}`}
                </span>
            </div>
        </div>

        {isDraftMode ? (
             <div className="flex justify-center mb-8 mt-10">
                <button 
                    onClick={finishDraft} 
                    className="px-10 py-3 bg-zinc-900 hover:bg-zinc-800 border border-green-900/50 rounded-full font-bold text-green-500 hover:text-green-400 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg shadow-green-900/10"
                >
                    <Check className="w-5 h-5" /> 完成并存档
                </button>
             </div>
        ) : (
             <div className="flex justify-center mb-8 mt-10">
                 <button 
                    onClick={() => setCurrentIndex(-1)} 
                    className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-sm font-bold text-zinc-400 hover:text-white transition-all flex items-center gap-2"
                >
                    <BookOpen className="w-4 h-4" /> 返回新建
                </button>
             </div>
        )}

        <div className="grid gap-6">
            {currentSentencesDisplay.map((data, idx) => (
                <SentenceCard 
                    key={idx} 
                    index={idx}
                    data={data as any} 
                    corePhrase={currentCorePhraseDisplay}
                    onUpdate={(field, val) => handleUpdate(idx, field, val)}
                    onGenerate={() => handleGenerateSingle(idx)}
                    isGenerating={!!isGeneratingMap[idx]}
                />
            ))}
        </div>
      </main>

      {/* Audio Player */}
      <AudioControls 
        sentenceList={currentSentencesDisplay.map(s => s.content)}
        userAudios={currentUserAudiosDisplay}
        onAddUserAudio={addUserAudio}
        accent={accent}
        setAccent={setAccent}
      />

      {/* History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
                  
                  {/* History Header */}
                  <div className="flex items-center justify-between mb-6 shrink-0">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <History className="w-5 h-5 text-green-500"/> 历史记录
                      </h2>
                      <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setSelectionMode(!selectionMode);
                                setSelectedIds(new Set());
                            }}
                            className={`p-2 rounded-lg transition-colors ${selectionMode ? 'bg-green-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                            title="选择生成故事"
                        >
                            <Sparkles className="w-5 h-5"/>
                        </button>
                        <button onClick={() => setShowHistoryModal(false)} className="p-2 text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                      </div>
                  </div>
                  
                  {/* Selection Action Bar */}
                  {selectionMode && (
                      <div className="mb-4 shrink-0 bg-zinc-900 p-4 rounded-xl border border-green-900/30 flex items-center justify-between animate-in slide-in-from-top-2">
                          <span className="text-sm font-bold text-green-400">已选: {selectedIds.size}</span>
                          <button 
                            disabled={selectedIds.size === 0 || isGeneratingStory}
                            onClick={handleCreateStory}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
                          >
                             {isGeneratingStory ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>} 生成故事
                          </button>
                      </div>
                  )}

                  {history.length === 0 ? (
                      <div className="text-center text-zinc-600 py-10">暂无记录</div>
                  ) : (
                      <div className="space-y-6 overflow-y-auto flex-1 pb-10">
                          {Object.entries(groupHistoryByDate()).map(([date, sessions]) => (
                              <div key={date}>
                                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-zinc-950 py-2 z-10">{date}</div>
                                  <div className="space-y-2">
                                      {sessions.map((session) => (
                                          <div key={session.id} className="flex items-center gap-2">
                                              {selectionMode && (
                                                  <button 
                                                    onClick={() => toggleSelection(session.id)}
                                                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                        ${selectedIds.has(session.id) ? 'bg-green-500 border-green-500' : 'border-zinc-700 hover:border-zinc-500'}
                                                    `}
                                                  >
                                                      {selectedIds.has(session.id) && <Check className="w-3 h-3 text-black font-bold"/>}
                                                  </button>
                                              )}
                                              <button 
                                                  onClick={() => {
                                                      if (selectionMode) {
                                                          toggleSelection(session.id);
                                                      } else {
                                                          const realIdx = history.findIndex(h => h.id === session.id);
                                                          setCurrentIndex(realIdx);
                                                          setShowHistoryModal(false);
                                                      }
                                                  }}
                                                  className={`flex-1 text-left p-4 rounded-xl border transition-all
                                                      ${history[currentIndex]?.id === session.id && !selectionMode
                                                          ? 'bg-zinc-800 border-green-500/50' 
                                                          : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}
                                                      ${selectionMode && selectedIds.has(session.id) ? 'bg-green-900/20 border-green-900' : ''}
                                                  `}
                                              >
                                                  <div className="text-sm font-bold text-white mb-1">{session.corePhrase}</div>
                                                  <div className="text-xs text-zinc-500 truncate">
                                                      {session.sentences[0].content || "No content"}
                                                  </div>
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Story Result Modal */}
      {storyResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  {/* Decorative bg */}
                  <div className="absolute top-0 right-0 p-32 bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                  <button 
                    onClick={() => {
                        stopStoryAudio();
                        setStoryResult(null);
                    }}
                    className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors z-10"
                  >
                      <X className="w-5 h-5"/>
                  </button>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl shadow-lg shadow-green-900/20">
                            <Sparkles className="w-6 h-6 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{storyResult.title}</h2>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">AI Generated Story</p>
                        </div>
                    </div>

                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-800/50 mb-8 max-h-[50vh] overflow-y-auto text-lg leading-relaxed text-zinc-300 font-serif">
                        {storyResult.content.split('\n').map((para, i) => (
                            <p key={i} className="mb-4 last:mb-0">{para}</p>
                        ))}
                    </div>

                    <div className="flex justify-center">
                         <button 
                            onClick={toggleStoryPlay}
                            className={`px-12 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all shadow-xl hover:scale-105 active:scale-95
                                ${isStoryPlaying ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/30'}
                            `}
                         >
                            {isStoryPlaying ? (
                                <><Pause className="w-5 h-5 fill-current"/> 暂停播放</>
                            ) : (
                                <><Play className="w-5 h-5 fill-current"/> 播放故事语音</>
                            )}
                         </button>
                    </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;