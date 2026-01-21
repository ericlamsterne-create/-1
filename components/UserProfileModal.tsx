
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AccentType, AppTheme, LogicFormula } from '../types';
import { SENTENCE_FORMULAS } from '../data/sentenceFormulas';
import { X, Check, Save, Sparkles, Settings, Volume2, Mail, Upload, Download, Wand2, Loader2, Send, Moon, Sun, Coffee, Sliders, Gauge, FileText, Undo2, UserCircle2, Globe, Brain, Home, Plane, ShoppingBag, Briefcase, Smile, Zap, CreditCard, Edit2, Play, Target, Mic2, ToggleLeft, ToggleRight, Laptop, Scale, Palette, Heart, Landmark, Sprout, Cloud, Lock, Monitor, DollarSign, Book, Lightbulb, Users, MessageSquarePlus, GraduationCap } from 'lucide-react';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';
import { refineInspiration, analyzeFeedback, generateSpeech, createWavBlob, optimizeUserSentence } from '../services/geminiService';
import { exportInspirationToWord, importInspirationFromWord, exportPersonaToWord, importPersonaFromWord } from '../services/documentService';

interface UserProfileModalProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

// Helper: Translation Function
const t = (lang: 'cn'|'en', cn: string, en: string) => lang === 'cn' ? cn : en;

// CONSTANT PREVIEW TEXTS FOR CACHING
const PREVIEW_TEXT_US = "Hi there! I'm ready to help you practice English.";
const PREVIEW_TEXT_UK = "Hello. I am your speaking partner for today.";

// --- CONFIGURATION: 7 Categories, Expanded Worldview ---
const PERSONA_CONFIG = (lang: 'cn'|'en') => [
    {
        title: lang === 'cn' ? "1. 身份与能力 (Identity & Ability)" : "1. Identity & Ability",
        icon: Briefcase,
        color: "text-blue-600",
        bg: "bg-blue-50",
        fields: [
            { key: 'identity_role', label: lang === 'cn' ? "当前身份 (Role)" : "Role", type: 'input', ph: "e.g. Student / Software Engineer" },
            { key: 'identity_education', label: lang === 'cn' ? "教育背景 (Education)" : "Education", type: 'select', options: lang === 'cn' ? ['文科生 (Arts)', '理科生 (Science)', '商科 (Business)', '艺术生 (Art)', '已工作 (Working)'] : ['Arts Student', 'Science Student', 'Business Student', 'Art Student', 'Working Professional'] },
            { key: 'identity_skills', label: lang === 'cn' ? "擅长技能 (Skills)" : "Skills", type: 'input', ph: "e.g. Coding, Cooking, Driving" },
        ]
    },
    {
        title: lang === 'cn' ? "2. 生活方式 (Lifestyle)" : "2. Lifestyle",
        icon: Coffee,
        color: "text-orange-600",
        bg: "bg-orange-50",
        fields: [
            { key: 'life_daily_routine', label: lang === 'cn' ? "作息 (Routine)" : "Routine", type: 'select', options: lang === 'cn' ? ['早起鸟 (Early Bird)', '夜猫子 (Night Owl)', '朝九晚五 (9-to-5)', '自由灵活 (Flexible)'] : ['Early Bird', 'Night Owl', '9-to-5', 'Flexible'] },
            { key: 'life_clothes', label: lang === 'cn' ? "穿衣风格 (Clothes)" : "Clothes", type: 'select', options: lang === 'cn' ? ['舒适休闲 (Casual/Comfort)', '时尚潮流 (Trendy)', '商务正装 (Formal)', '极简风 (Minimalist)'] : ['Casual/Comfort', 'Trendy', 'Formal', 'Minimalist'] },
            { key: 'life_food', label: lang === 'cn' ? "饮食偏好 (Food)" : "Food", type: 'select', options: lang === 'cn' ? ['无辣不欢 (Spicy Lover)', '健康轻食 (Healthy/Light)', '甜食控 (Sweet Tooth)', '什么都吃 (Foodie)'] : ['Spicy Lover', 'Healthy/Light', 'Sweet Tooth', 'Foodie'] },
            { key: 'life_health', label: lang === 'cn' ? "健康/运动 (Health)" : "Health", type: 'select', options: lang === 'cn' ? ['健身达人 (Gym Goer)', '偶尔运动 (Occasional)', '宅家不动 (Sedentary)', '户外爱好者 (Outdoor)'] : ['Gym Goer', 'Occasional', 'Sedentary', 'Outdoor Lover'] },
            { key: 'life_transport', label: lang === 'cn' ? "交通方式 (Transport)" : "Transport", type: 'select', options: lang === 'cn' ? ['公共交通 (Public Transport)', '开车 (Driving)', '骑行/步行 (Cycling/Walking)'] : ['Public Transport', 'Driving', 'Cycling/Walking'] },
            { key: 'life_objects', label: lang === 'cn' ? "物品观念 (Objects)" : "Objects", type: 'select', options: lang === 'cn' ? ['极简主义 (Minimalist)', '囤积/收藏 (Collector)', '实用主义 (Practical)', '追求最新 (Tech/Newest)'] : ['Minimalist', 'Collector', 'Practical', 'Tech/Newest'] },
        ]
    },
    {
        title: lang === 'cn' ? "3. 环境与居住 (Environment)" : "3. Environment",
        icon: Home,
        color: "text-green-600",
        bg: "bg-green-50",
        fields: [
            { key: 'env_city_country', label: lang === 'cn' ? "城乡偏好 (City/Country)" : "City/Country", type: 'select', options: lang === 'cn' ? ['繁华都市 (Big City)', '安静小镇 (Small Town)', '自然田园 (Countryside)'] : ['Big City', 'Small Town', 'Countryside'] },
            { key: 'env_housing', label: lang === 'cn' ? "居住类型 (Housing)" : "Housing", type: 'select', options: lang === 'cn' ? ['现代公寓 (Apartment)', '独栋房子 (House)', '学校宿舍 (Dorm)', '合租 (Shared)'] : ['Apartment', 'House', 'Dorm', 'Shared'] },
            { key: 'env_architecture', label: lang === 'cn' ? "建筑审美 (Architecture)" : "Architecture", type: 'select', options: lang === 'cn' ? ['现代摩登 (Modern)', '历史古迹 (Historical)', '实用建筑 (Functional)', '绿色生态 (Eco-friendly)'] : ['Modern', 'Historical', 'Functional', 'Eco-friendly'] },
            { key: 'env_safety', label: lang === 'cn' ? "安全感/犯罪 (Safety)" : "Safety", type: 'select', options: lang === 'cn' ? ['非常安全 (Safe)', '有些担忧 (Concerned)', '更注重隐私 (Privacy Focused)'] : ['Safe', 'Concerned', 'Privacy Focused'] },
        ]
    },
    {
        title: lang === 'cn' ? "4. 社交与情感 (Social & Inner)" : "4. Social & Inner",
        icon: Users,
        color: "text-pink-600",
        bg: "bg-pink-50",
        fields: [
            { key: 'social_style', label: lang === 'cn' ? "社交风格 (Social)" : "Social", type: 'select', options: lang === 'cn' ? ['社牛 (Extrovert)', '社恐 (Introvert)', '慢热 (Ambivert)', '独行侠 (Loner)'] : ['Extrovert', 'Introvert', 'Ambivert', 'Loner'] },
            { key: 'social_media', label: lang === 'cn' ? "社交媒体 (Social Media)" : "Social Media", type: 'select', options: lang === 'cn' ? ['重度用户 (Addicted)', '只看不发 (Lurker)', '很少使用 (Rarely)', '反感 (Dislike)'] : ['Addicted', 'Lurker', 'Rarely', 'Dislike'] },
            { key: 'social_family', label: lang === 'cn' ? "家庭/亲子 (Parenting)" : "Family", type: 'select', options: lang === 'cn' ? ['家庭观念重 (Family First)', '独立自主 (Independent)', '严格管教 (Strict)', '朋友式相处 (Friendly)'] : ['Family First', 'Independent', 'Strict', 'Friendly'] },
            { key: 'social_conflict', label: lang === 'cn' ? "投诉/冲突 (Conflict)" : "Conflict", type: 'select', options: lang === 'cn' ? ['据理力争 (Assertive)', '息事宁人 (Avoidant)', '寻求调解 (Mediator)'] : ['Assertive', 'Avoidant', 'Mediator'] },
            { key: 'mind_personality', label: lang === 'cn' ? "性格/人设 (Persona)" : "Personality", type: 'input', ph: "e.g. INTJ, Perfectionist, Optimist" },
            { key: 'mind_meditation', label: lang === 'cn' ? "压力调节 (Stress)" : "Stress", type: 'select', options: lang === 'cn' ? ['冥想/独处 (Meditation)', '运动发泄 (Sports)', '找人倾诉 (Talking)', '吃东西 (Eating)'] : ['Meditation', 'Sports', 'Talking', 'Eating'] },
        ]
    },
    {
        title: lang === 'cn' ? "5. 文化与兴趣 (Culture & Interest)" : "5. Culture & Interest",
        icon: Palette,
        color: "text-purple-600",
        bg: "bg-purple-50",
        fields: [
            { key: 'interest_art', label: lang === 'cn' ? "艺术/音乐 (Art)" : "Art", type: 'select', options: lang === 'cn' ? ['流行文化 (Pop Culture)', '古典传统 (Classical)', '抽象前卫 (Abstract)', '不感兴趣 (Not interested)'] : ['Pop Culture', 'Classical', 'Abstract', 'Not interested'] },
            { key: 'interest_movies', label: lang === 'cn' ? "电影/娱乐 (Movies)" : "Movies", type: 'select', options: lang === 'cn' ? ['科幻动作 (Sci-Fi/Action)', '文艺剧情 (Drama)', '喜剧 (Comedy)', '纪录片 (Documentary)'] : ['Sci-Fi/Action', 'Drama', 'Comedy', 'Documentary'] },
            { key: 'interest_history', label: lang === 'cn' ? "历史观念 (History)" : "History", type: 'select', options: lang === 'cn' ? ['怀旧派 (Nostalgic)', '向前看 (Future Focused)', '以史为鉴 (Learn from Past)'] : ['Nostalgic', 'Future Focused', 'Learn from Past'] },
            { key: 'interest_travel', label: lang === 'cn' ? "旅游偏好 (Travel)" : "Travel", type: 'select', options: lang === 'cn' ? ['自然风光 (Nature)', '人文古迹 (Culture)', '度假躺平 (Relaxing)', '特种兵打卡 (Busy)'] : ['Nature', 'Culture', 'Relaxing', 'Busy'] },
        ]
    },
    {
        title: lang === 'cn' ? "6. 宏观价值观 (Worldview)" : "6. Worldview",
        icon: Globe,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        fields: [
            { key: 'value_money', label: lang === 'cn' ? "金钱观 (Money)" : "Money", type: 'select', options: lang === 'cn' ? ['储蓄/节俭 (Saver)', '享乐/月光 (Spender)', '投资理财 (Investor)', '体验至上 (Experience)'] : ['Saver', 'Spender', 'Investor', 'Experience'] },
            { key: 'value_science', label: lang === 'cn' ? "科技态度 (Sci/Tech)" : "Sci/Tech", type: 'select', options: lang === 'cn' ? ['拥抱AI (Tech Optimist)', '传统保守 (Traditionalist)', '谨慎怀疑 (Skeptic)'] : ['Tech Optimist', 'Traditionalist', 'Skeptic'] },
            { key: 'value_advertising', label: lang === 'cn' ? "广告态度 (Ads)" : "Ads", type: 'select', options: lang === 'cn' ? ['容易被种草 (Influenced)', '理性消费 (Rational)', '厌恶广告 (Annoyed)'] : ['Influenced', 'Rational', 'Annoyed'] },
            
            // --- NEW ADDITIONS ---
            { key: 'value_environment', label: lang === 'cn' ? "环境观 (Environment)" : "Environment", type: 'select', options: lang === 'cn' ? ['环保激进派 (Eco-Warrior)', '便利优先 (Convenience First)', '平衡派 (Balanced)', '不关心 (Indifferent)'] : ['Eco-Warrior', 'Convenience First', 'Balanced', 'Indifferent'] },
            { key: 'value_success', label: lang === 'cn' ? "成功定义 (Success)" : "Success", type: 'select', options: lang === 'cn' ? ['结果导向 (Result Oriented)', '过程为王 (Process Oriented)', '快乐至上 (Happiness First)', '财富地位 (Wealth/Status)'] : ['Result Oriented', 'Process Oriented', 'Happiness First', 'Wealth/Status'] },
            { key: 'value_tradition', label: lang === 'cn' ? "传统与现代 (Tradition)" : "Tradition", type: 'select', options: lang === 'cn' ? ['拥抱变化 (Embrace Change)', '坚守传统 (Preserve Tradition)', '中庸之道 (Middle Ground)'] : ['Embrace Change', 'Preserve Tradition', 'Middle Ground'] },
            { key: 'value_globalization', label: lang === 'cn' ? "全球化 (Global)" : "Globalization", type: 'select', options: lang === 'cn' ? ['世界公民 (Global Citizen)', '本土文化保护 (Local Culture)', '保持开放 (Open-minded)'] : ['Global Citizen', 'Local Culture', 'Open-minded'] },
        ]
    }
];

const generateRichPersona = (p: UserProfile): string => {
    // We only need basic compilation here, logic is handled in geminiService
    return JSON.stringify(p);
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ initialProfile, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'persona' | 'inspiration' | 'formulas'>('settings');
  
  const [profile, setProfile] = useState<UserProfile>({ ...initialProfile });
  
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(SENTENCE_FORMULAS[0].id);
  const [editingSkeleton, setEditingSkeleton] = useState<string>("");
  const [inspirationInput, setInspirationInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState(false);
  const [aiPromptAdvice, setAiPromptAdvice] = useState<string | null>(null);
  
  // Optimization State
  const [optimizingField, setOptimizingField] = useState<string | null>(null);

  // Audio Preview
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Groups
  const groups = profile.preferredAccent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET;
  const deepVoices = groups.filter(v => v.voiceSettings?.style === 'Deep');
  const narrVoices = groups.filter(v => v.voiceSettings?.style === 'Narrative');
  const liveVoices = groups.filter(v => v.voiceSettings?.style === 'Lively');

  // Helper to strip tags for clean editing
  const stripTags = (text: string) => text.replace(/<[^>]+>/g, '').trim();

  useEffect(() => {
      const custom = profile.customFormulas?.find(f => f.id === selectedFormulaId);
      const original = SENTENCE_FORMULAS.find(f => f.id === selectedFormulaId);
      const target = custom || original;
      
      if (target) {
          if (target.variations && target.variations.length > 0) {
              const raw = target.variations[0].skeleton.join('\n');
              setEditingSkeleton(raw.split('\n').map(stripTags).join('\n'));
          } else {
              const raw = target.skeleton.join('\n');
              setEditingSkeleton(raw.split('\n').map(stripTags).join('\n'));
          }
      }
  }, [selectedFormulaId, profile.customFormulas]);

  useEffect(() => {
      return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNoteChange = (fieldKey: string, note: string) => {
      setProfile(prev => ({
          ...prev,
          persona_notes: {
              ...(prev.persona_notes || {}),
              [fieldKey]: note
          }
      }));
  };

  const handleOptimizeNote = async (fieldKey: string) => {
      const currentNote = profile.persona_notes?.[fieldKey];
      if (!currentNote || !currentNote.trim()) return;

      setOptimizingField(fieldKey);
      try {
          // Use the existing optimizeUserSentence but adapt it for notes
          const result = await optimizeUserSentence(currentNote, "Persona Note", "Refine user's personal context");
          handleNoteChange(fieldKey, result.content);
      } catch (e) {
          alert("Optimization failed. Please try again.");
      } finally {
          setOptimizingField(null);
      }
  };

  const handleVoiceSelect = async (voiceId: string, geminiVoiceName: string) => {
      if (playingVoiceId === voiceId) return; 
      
      handleChange('preferredVoiceId', voiceId);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      setPlayingVoiceId(voiceId);
      setUsingFallback(false);

      // USE CONSTANT TEXT FOR CACHE HITS
      const previewText = profile.preferredAccent === AccentType.UK 
          ? PREVIEW_TEXT_UK
          : PREVIEW_TEXT_US;

      try {
          // If cached in IndexedDB, this call is near-instant and costs 0 RPD
          const pcmBuffer = await generateSpeech(previewText, geminiVoiceName || 'Zephyr');
          const wavBlob = createWavBlob(pcmBuffer);
          const url = URL.createObjectURL(wavBlob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { setPlayingVoiceId(null); URL.revokeObjectURL(url); };
          await audio.play();
      } catch (e: any) { 
          console.error("Preview failed", e);
          setUsingFallback(true);
      }
  };

  const handleSaveFormula = () => {
      const original = SENTENCE_FORMULAS.find(f => f.id === selectedFormulaId);
      if (!original) return;
      const newSkeletonArray = editingSkeleton.split('\n').filter(s => s.trim().length > 0);
      let newFormula: LogicFormula = { ...original };
      if (newFormula.variations && newFormula.variations.length > 0) {
          const newVariations = [...newFormula.variations];
          newVariations[0] = { ...newVariations[0], skeleton: newSkeletonArray };
          newFormula.variations = newVariations;
      } else { newFormula.skeleton = newSkeletonArray; }
      setProfile(prev => {
          const others = (prev.customFormulas || []).filter(f => f.id !== selectedFormulaId);
          return { ...prev, customFormulas: [...others, newFormula] };
      });
      alert(t(profile.language, "公式已更新！", "Formula updated!"));
  };

  const handleResetFormula = () => {
      const original = SENTENCE_FORMULAS.find(f => f.id === selectedFormulaId);
      if (original) {
          const content = original.variations && original.variations.length > 0 ? original.variations[0].skeleton.join('\n') : original.skeleton.join('\n');
          setEditingSkeleton(content.split('\n').map(stripTags).join('\n'));
          setProfile(prev => ({ ...prev, customFormulas: (prev.customFormulas || []).filter(f => f.id !== selectedFormulaId) }));
      }
  };

  const handleToggleFormula = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setProfile(prev => {
          const currentDisabled = prev.disabledFormulaIds || [];
          const isCurrentlyDisabled = currentDisabled.includes(id);
          
          if (isCurrentlyDisabled) {
              return { ...prev, disabledFormulaIds: currentDisabled.filter(fid => fid !== id) };
          } else {
              return { ...prev, disabledFormulaIds: [...currentDisabled, id] };
          }
      });
  };

  const handleSubmit = () => { 
      const richPersona = generateRichPersona(profile);
      const finalProfile = { ...profile, generatedPersona: richPersona };
      onSave(finalProfile); 
      onClose(); 
  };

  const handleRefineAndSave = async () => {
      if (!inspirationInput.trim()) return;
      setIsRefining(true);
      try {
          const refined = await refineInspiration(inspirationInput);
          const timestamp = new Date().toLocaleDateString();
          setProfile(prev => ({ ...prev, inspiration: (prev.inspiration ? prev.inspiration + "\n\n" : "") + `[${timestamp}] ${refined}` }));
          setInspirationInput("");
      } catch (e) { alert("Refining failed."); } finally { setIsRefining(false); }
  };

  const handleFeedbackSubmit = async () => {
      if(!feedback.trim()) return;
      setIsAnalyzingFeedback(true);
      try {
          const advice = await analyzeFeedback(feedback);
          setAiPromptAdvice(advice);
          setFeedback("");
      } catch(e) { console.error(e); } finally { setIsAnalyzingFeedback(false); }
  };

  const handleImportInspiration = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const text = await importInspirationFromWord(file);
          if (text) setProfile(prev => ({ ...prev, inspiration: (prev.inspiration ? prev.inspiration + "\n\n" : "") + text }));
      } catch (err: any) { alert("Import failed"); }
      e.target.value = '';
  };

  const handleImportPersona = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const imported = await importPersonaFromWord(file);
          setProfile(prev => ({
              ...prev,
              ...imported,
              // Merge notes instead of overwriting all
              persona_notes: { ...prev.persona_notes, ...imported.persona_notes }
          }));
          alert(t(profile.language, "人设导入成功！", "Persona imported successfully!"));
      } catch (err: any) { 
          alert(t(profile.language, "导入失败: ", "Import failed: ") + err.message); 
      }
      e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-bg-card w-full max-w-5xl max-h-[95vh] rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col border-2 border-[#E5E5E5]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
              <h2 className="text-3xl font-black text-fg-main flex items-center gap-3">
                  <Settings className="w-8 h-8 text-fg-muted"/> {t(profile.language, '设置', 'Settings')}
              </h2>
              <p className="text-sm font-bold text-fg-muted ml-11">{t(profile.language, '定制您的专属口语教练', 'Personalize your AI coach')}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-bg-input rounded-full hover:bg-bg-hover transition-colors text-fg-main"><X className="w-6 h-6 stroke-[3]" /></button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-bg-input rounded-xl mb-6 shrink-0 gap-1 overflow-x-auto">
            <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[100px] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-bg-card shadow-sm text-fg-main' : 'text-fg-sub hover:text-fg-muted'}`}>
                <UserCircle2 className="w-4 h-4"/> {t(profile.language, '通用', 'General')}
            </button>
            <button onClick={() => setActiveTab('persona')} className={`flex-1 min-w-[100px] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'persona' ? 'bg-bg-card shadow-sm text-duo-purple' : 'text-fg-sub hover:text-fg-muted'}`}>
                <Brain className="w-4 h-4"/> {t(profile.language, '人设', 'Persona')}
            </button>
            <button onClick={() => setActiveTab('inspiration')} className={`flex-1 min-w-[100px] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'inspiration' ? 'bg-bg-card shadow-sm text-duo-orange' : 'text-fg-sub hover:text-fg-muted'}`}>
                <Wand2 className="w-4 h-4"/> {t(profile.language, '灵感', 'Inspiration')}
            </button>
            <button onClick={() => setActiveTab('formulas')} className={`flex-1 min-w-[100px] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'formulas' ? 'bg-bg-card shadow-sm text-duo-blue' : 'text-fg-sub hover:text-fg-muted'}`}>
                <FileText className="w-4 h-4"/> {t(profile.language, '公式', 'Formulas')}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 pr-2">
            
            {/* --- TAB 1: SETTINGS --- */}
            {activeTab === 'settings' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* Goal & Standards (Moved to Top) */}
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-duo-orange"/> {t(profile.language, '目标与偏好', 'Goal & Preference')}</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">{t(profile.language, '雅思口语目标分', 'Target Score')}</label>
                                <Select 
                                    label=""
                                    val={profile.targetScoreSpeaking || "6.5"} 
                                    onChange={(v: string) => handleChange('targetScoreSpeaking', v)} 
                                    options={['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']} 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">{t(profile.language, '偏好补充 (用词/风格)', 'Style Preference (e.g. use idioms)')}</label>
                                <input 
                                    className="w-full bg-bg-card border-2 border-border focus:border-duo-orange rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all text-fg-main placeholder:text-fg-sub/50"
                                    placeholder={t(profile.language, "例如: 想要地道习语, 简单直接, 或学术化...", "e.g. Prefer idioms, or simple & direct...")}
                                    value={profile.targetScoreDetail || ''}
                                    onChange={e => handleChange('targetScoreDetail', e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 1. Language & Theme */}
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-duo-blue"/> {t(profile.language, '语言与显示', 'Language & Theme')}</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">Interface Language</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handleChange('language', 'cn')} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${profile.language === 'cn' ? 'bg-white border-duo-blue text-duo-blue shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}>中文</button>
                                    <button onClick={() => handleChange('language', 'en')} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${profile.language === 'en' ? 'bg-white border-duo-blue text-duo-blue shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}>English</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">{t(profile.language, '主题', 'Theme')}</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handleChange('theme', AppTheme.LIGHT)} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${profile.theme === AppTheme.LIGHT ? 'bg-white border-duo-orange text-duo-orange shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}><Sun className="w-4 h-4"/> {t(profile.language, '浅色', 'Light')}</button>
                                    <button onClick={() => handleChange('theme', AppTheme.DARK)} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${profile.theme === AppTheme.DARK ? 'bg-slate-800 border-duo-blue text-duo-blue shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}><Moon className="w-4 h-4"/> {t(profile.language, '深色', 'Dark')}</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Voice & Audio */}
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><Volume2 className="w-5 h-5 text-duo-green"/> {t(profile.language, '语音设置', 'Voice & Audio')}</h3>
                        <div className="space-y-6">
                            {/* Accent Selection */}
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">{t(profile.language, '口音偏好', 'Accent Preference')}</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handleChange('preferredAccent', AccentType.US)} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${profile.preferredAccent === AccentType.US ? 'bg-white border-duo-blue text-duo-blue shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}>{t(profile.language, '美式', 'American')}</button>
                                    <button onClick={() => handleChange('preferredAccent', AccentType.UK)} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${profile.preferredAccent === AccentType.UK ? 'bg-white border-duo-purple text-duo-purple shadow-sm' : 'bg-bg-card border-border text-fg-muted'}`}>{t(profile.language, '英式', 'British')}</button>
                                </div>
                            </div>
                            {/* Voices */}
                            <div>
                                <label className="text-xs font-bold text-fg-sub uppercase ml-1 mb-2 block">
                                    {t(profile.language, '声音角色 (点击试听)', 'Voice Character (Click to Preview)')}
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Deep (深沉)</div>
                                        {deepVoices.map(voice => (
                                            <button key={voice.id} onClick={() => handleVoiceSelect(voice.id, voice.geminiVoiceName || 'Zephyr')} className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden h-20 ${profile.preferredVoiceId === voice.id ? 'bg-duo-green/10 border-duo-green text-duo-green' : 'bg-bg-card border-border text-fg-muted hover:border-duo-green/30'}`}>
                                                {playingVoiceId === voice.id && <span className="absolute inset-0 bg-duo-green/20 animate-pulse"></span>}
                                                <span className="truncate w-full text-center">{voice.label.split('(')[0]}</span>
                                                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${voice.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{voice.gender === 'male' ? 'Male' : 'Female'}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Narrative (叙述)</div>
                                        {narrVoices.map(voice => (
                                            <button key={voice.id} onClick={() => handleVoiceSelect(voice.id, voice.geminiVoiceName || 'Zephyr')} className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden h-20 ${profile.preferredVoiceId === voice.id ? 'bg-duo-green/10 border-duo-green text-duo-green' : 'bg-bg-card border-border text-fg-muted hover:border-duo-green/30'}`}>
                                                {playingVoiceId === voice.id && <span className="absolute inset-0 bg-duo-green/20 animate-pulse"></span>}
                                                <span className="truncate w-full text-center">{voice.label.split('(')[0]}</span>
                                                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${voice.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{voice.gender === 'male' ? 'Male' : 'Female'}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Lively (活泼)</div>
                                        {liveVoices.map(voice => (
                                            <button key={voice.id} onClick={() => handleVoiceSelect(voice.id, voice.geminiVoiceName || 'Zephyr')} className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden h-20 ${profile.preferredVoiceId === voice.id ? 'bg-duo-green/10 border-duo-green text-duo-green' : 'bg-bg-card border-border text-fg-muted hover:border-duo-green/30'}`}>
                                                {playingVoiceId === voice.id && <span className="absolute inset-0 bg-duo-green/20 animate-pulse"></span>}
                                                <span className="truncate w-full text-center">{voice.label.split('(')[0]}</span>
                                                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${voice.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{voice.gender === 'male' ? 'Male' : 'Female'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Speed */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-fg-sub uppercase ml-1">{t(profile.language, '默认语速', 'Playback Speed')}</label>
                                     <span className="text-xs font-black text-duo-green bg-duo-green/10 px-2 py-1 rounded flex items-center gap-1"><Gauge className="w-3 h-3"/> {profile.playbackSpeed}x</span>
                                </div>
                                <input type="range" min="0.5" max="2.0" step="0.25" value={profile.playbackSpeed} onChange={(e) => handleChange('playbackSpeed', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-duo-green"/>
                            </div>
                        </div>
                    </section>
                    
                    {/* Feedback */}
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-duo-green"/> {t(profile.language, '反馈建议', 'Feedback & Request')}</h3>
                        <div className="relative">
                            <textarea className="w-full bg-bg-card border-2 border-border rounded-xl p-4 pr-12 font-medium text-sm resize-none focus:border-duo-green outline-none h-24" placeholder={t(profile.language, "告诉我们你需要什么...", "Tell us what you need...")} value={feedback} onChange={e => setFeedback(e.target.value)}/>
                            <button onClick={handleFeedbackSubmit} disabled={isAnalyzingFeedback || !feedback.trim()} className="absolute bottom-3 right-3 p-2 bg-duo-green hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50">{isAnalyzingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}</button>
                        </div>
                        {aiPromptAdvice && <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed animate-fade-in"><span className="font-bold block mb-1">AI Suggestion:</span> {aiPromptAdvice}</div>}
                     </section>
                </div>
            )}

            {/* --- TAB 2, 3, 4 ... (Kept exactly same) --- */}
            {activeTab === 'persona' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => exportPersonaToWord(profile)} className="px-4 py-2 bg-bg-card border border-border rounded-xl text-xs font-bold text-fg-muted hover:text-fg-main flex items-center justify-center gap-2 transition-colors"><Download className="w-3.5 h-3.5"/> {t(profile.language, "导出人设表 (Export)", "Export Persona")}</button>
                        <label className="px-4 py-2 bg-bg-card border border-border rounded-xl text-xs font-bold text-fg-muted hover:text-fg-main flex items-center justify-center gap-2 cursor-pointer transition-colors"><Upload className="w-3.5 h-3.5"/> {t(profile.language, "导入人设 (Import)", "Import Persona")} <input type="file" onChange={handleImportPersona} className="hidden" accept=".docx"/></label>
                    </div>

                    <div className="bg-duo-purple/5 border border-duo-purple/20 p-4 rounded-2xl flex gap-3">
                        <div className="p-2 bg-white rounded-xl h-fit"><Brain className="w-6 h-6 text-duo-purple"/></div>
                        <div>
                            <h4 className="font-bold text-duo-purple text-sm mb-1">{t(profile.language, '构建你的全息数字分身', 'Build Your Holographic Persona')}</h4>
                            <p className="text-xs text-duo-purple/80 leading-relaxed">
                                {t(profile.language, '我们极大地扩展了人设维度。AI 将根据这 28 个维度的信息，在回答艺术、犯罪、历史、消费等各类话题时，生成完全符合你三观的个性化答案。', 'We expanded the persona to 28 dimensions covering Art, History, Crime, Money, etc.')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {PERSONA_CONFIG(profile.language).map((category, idx) => (
                            <div key={idx} className={`bg-bg-input p-6 rounded-3xl border border-border`}>
                                <h4 className={`flex items-center gap-2 text-sm font-black ${category.color} uppercase tracking-wider border-b border-border/50 pb-3 mb-4`}>
                                    <category.icon className="w-5 h-5"/> {category.title}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                                    {category.fields.map((field, fIdx) => (
                                        <div key={fIdx} className="bg-bg-card p-3 rounded-2xl border border-border/50 shadow-sm relative group focus-within:ring-2 focus-within:ring-duo-purple/20 transition-all">
                                            {field.type === 'select' ? (
                                                <Select 
                                                    label={field.label} 
                                                    val={(profile as any)[field.key]} 
                                                    onChange={(v: string) => handleChange(field.key as keyof UserProfile, v)} 
                                                    options={field.options || []} 
                                                />
                                            ) : (
                                                <Input 
                                                    label={field.label} 
                                                    val={(profile as any)[field.key]} 
                                                    onChange={(v: string) => handleChange(field.key as keyof UserProfile, v)} 
                                                    ph={field.ph} 
                                                />
                                            )}
                                            
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                <div className="flex items-center gap-1.5 relative">
                                                    <MessageSquarePlus className="w-3 h-3 text-fg-sub opacity-50 shrink-0"/>
                                                    <input 
                                                        className="w-full bg-transparent text-[10px] text-fg-main placeholder:text-fg-sub/40 outline-none font-medium pr-6"
                                                        placeholder={t(profile.language, "补充细节...", "Add context...")}
                                                        value={profile.persona_notes?.[field.key] || ''}
                                                        onChange={(e) => handleNoteChange(field.key, e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => handleOptimizeNote(field.key)}
                                                        disabled={!profile.persona_notes?.[field.key] || optimizingField === field.key}
                                                        className="absolute right-0 p-1 text-duo-purple hover:bg-duo-purple/10 rounded transition-colors disabled:opacity-30"
                                                        title={t(profile.language, "优化润色", "Refine Note")}
                                                    >
                                                        {optimizingField === field.key ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Strategic Focus (Renamed from Custom/Keywords) */}
                        <div className="bg-bg-input p-6 rounded-3xl border border-border">
                            <h4 className="flex items-center gap-2 text-sm font-black text-rose-600 uppercase tracking-wider border-b border-border/50 pb-3 mb-4">
                                <Target className="w-5 h-5"/> {t(profile.language, '核心策略 / 强项话题 (Strategic Focus)', 'Strategic Focus')}
                            </h4>
                            <p className="text-xs text-fg-muted mb-2">告诉 AI 你最想引导的话题方向，或者你最擅长聊的领域。AI 会尽量往这些方向靠拢。</p>
                            <textarea 
                                className="w-full bg-bg-card border-2 border-border rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all h-24 resize-none placeholder:font-normal placeholder:text-slate-400"
                                placeholder={t(profile.language, "e.g. 我最擅长聊'科技'和'环保'，请尽量往这两个方向引导；或者：我是一个'极简主义者'，遇到物品类话题请表达我对物质的低欲望。", "e.g. I am best at talking about 'Technology' and 'Environment', please steer answers that way. Or: I am a minimalist, express low desire for material goods.")}
                                value={profile.user_defined_persona || ''}
                                onChange={e => handleChange('user_defined_persona', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ... (Inspiration and Formula tabs kept same) ... */}
            {activeTab === 'inspiration' && (
                <div className="space-y-8 animate-fade-in h-full flex flex-col">
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border flex-1 flex flex-col">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><Wand2 className="w-5 h-5 text-duo-orange"/> {t(profile.language, '灵感颗粒', 'Inspiration Particles')}</h3>
                        <p className="text-xs text-fg-muted mb-4">{t(profile.language, '记录下你平时想说的中文想法或英文片段，AI 会帮你整理。', 'Record your random thoughts here.')}</p>
                        <div className="flex gap-2 mb-4">
                            <input className="flex-1 bg-bg-card border-2 border-border rounded-xl px-4 py-3 font-medium outline-none focus:border-duo-orange" placeholder={t(profile.language, "输入想法...", "Add a thought...")} value={inspirationInput} onChange={e => setInspirationInput(e.target.value)}/>
                            <button onClick={handleRefineAndSave} disabled={!inspirationInput.trim() || isRefining} className="px-4 bg-duo-orange hover:bg-orange-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50">{isRefining ? <Loader2 className="w-5 h-5 animate-spin"/> : "+"}</button>
                        </div>
                        <div className="flex gap-2 mb-4">
                             <button onClick={() => exportInspirationToWord(profile.inspiration || "")} className="flex-1 py-2 bg-bg-card border border-border rounded-lg text-xs font-bold text-fg-muted hover:text-fg-main flex items-center justify-center gap-2"><Download className="w-3 h-3"/> {t(profile.language, "导出", "Export")}</button>
                             <label className="flex-1 py-2 bg-bg-card border border-border rounded-lg text-xs font-bold text-fg-muted hover:text-fg-main flex items-center justify-center gap-2 cursor-pointer"><Upload className="w-3 h-3"/> {t(profile.language, "导入", "Import")} <input type="file" onChange={handleImportInspiration} className="hidden" accept=".docx"/></label>
                        </div>
                        <textarea className="flex-1 w-full bg-bg-card border-2 border-border rounded-xl p-4 font-medium text-sm leading-relaxed resize-none focus:border-duo-orange focus:ring-4 focus:ring-duo-orange/10 outline-none" value={profile.inspiration || ""} onChange={e => handleChange('inspiration', e.target.value)} placeholder="Your collected ideas..."/>
                    </section>
                </div>
            )}

            {activeTab === 'formulas' && (
                <div className="h-full flex flex-col">
                    <section className="bg-bg-input p-6 rounded-3xl border-2 border-border flex-1 flex flex-col">
                        <h3 className="text-lg font-black text-fg-main mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-duo-purple"/> {t(profile.language, '公式编辑器', 'Formula Customization')}</h3>
                        <p className="text-xs text-fg-muted mb-6">{t(profile.language, '选择一个逻辑类型并编辑结构。', 'Select a logic type and edit the skeleton.')}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[300px] md:max-h-full">
                                {SENTENCE_FORMULAS.map(f => {
                                    const isCustomized = profile.customFormulas?.some(cf => cf.id === f.id);
                                    const isDisabled = profile.disabledFormulaIds?.includes(f.id);
                                    
                                    return (
                                        <div key={f.id} className="relative group/item">
                                            <button 
                                                onClick={() => setSelectedFormulaId(f.id)}
                                                className={`w-full text-left p-3 pr-10 rounded-xl border-2 text-xs font-bold transition-all ${selectedFormulaId === f.id ? 'bg-duo-purple text-white border-duo-purple' : 'bg-bg-card text-fg-main border-border hover:border-duo-purple/30'}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className={isDisabled ? 'opacity-50 line-through' : ''}>{f.category}</span>
                                                    {isCustomized && <span className="bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase tracking-wider">Edited</span>}
                                                </div>
                                                <div className={`mt-1 opacity-70 truncate ${selectedFormulaId === f.id ? 'text-white' : 'text-fg-sub'}`}>{f.description}</div>
                                            </button>
                                            <button 
                                                onClick={(e) => handleToggleFormula(f.id, e)} 
                                                className="absolute right-2 top-3 p-1 rounded-full hover:bg-white/10 z-10 transition-colors"
                                                title={isDisabled ? "Enable Formula" : "Disable Formula"}
                                            >
                                                {isDisabled ? (
                                                    <ToggleLeft className="w-5 h-5 text-fg-sub" />
                                                ) : (
                                                    <ToggleRight className={`w-5 h-5 ${selectedFormulaId === f.id ? 'text-green-300' : 'text-duo-green'}`} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="md:col-span-2 flex flex-col h-full">
                                <div className="flex-1 relative">
                                    <textarea 
                                        className="w-full h-full bg-bg-card border-2 border-border rounded-2xl p-5 font-mono text-sm leading-relaxed resize-none focus:border-duo-purple focus:ring-4 focus:ring-duo-purple/10 outline-none text-fg-main"
                                        value={editingSkeleton}
                                        onChange={(e) => setEditingSkeleton(e.target.value)}
                                        placeholder="Enter logic skeleton, one phrase per line..."
                                    />
                                    <div className="absolute top-2 right-2 text-[10px] text-slate-300 bg-white/80 backdrop-blur px-2 py-1 rounded select-none pointer-events-none">
                                        Support [Placeholders]
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4 justify-end">
                                    <button onClick={handleResetFormula} className="px-4 py-2 text-xs font-bold text-fg-muted hover:text-fg-main bg-bg-card border border-border rounded-xl flex items-center gap-2"><Undo2 className="w-4 h-4"/> {t(profile.language, '重置', 'Reset')}</button>
                                    <button onClick={handleSaveFormula} className="px-6 py-2 text-xs font-bold text-white bg-duo-purple hover:bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20 transition-transform active:scale-95 flex items-center gap-2"><Save className="w-4 h-4"/> {t(profile.language, '保存公式', 'Save Formula')}</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>

        <div className="mt-6 pt-6 border-t border-border flex justify-end w-full shrink-0">
             <button onClick={handleSubmit} className="px-10 py-3.5 bg-[#58CC02] hover:bg-[#46A302] text-white font-black rounded-2xl border-b-4 border-[#46A302] active:border-b-0 active:translate-y-[4px] transition-all flex items-center gap-2 text-sm uppercase tracking-wider shadow-lg shadow-green-200">
                 {t(profile.language, '保存配置', 'SAVE & GENERATE')}
             </button>
        </div>

      </div>
    </div>
  );
};

// Helper Components
const Input = ({ label, val, onChange, ph }: any) => (
    <div>
        <label className="text-[10px] font-bold text-fg-sub uppercase ml-1 block mb-1">{label}</label>
        <input className="w-full bg-bg-input border-0 border-b-2 border-border focus:border-duo-purple rounded-lg px-2 py-1.5 text-sm font-bold outline-none transition-all text-fg-main placeholder:text-fg-sub/50" placeholder={ph} value={val || ''} onChange={e => onChange(e.target.value)} />
    </div>
);

const Select = ({ label, val, onChange, options }: any) => (
    <div>
        <label className="text-[10px] font-bold text-fg-sub uppercase ml-1 block mb-1">{label}</label>
        <select className="w-full bg-bg-input border-0 border-b-2 border-border focus:border-duo-purple rounded-lg px-2 py-1.5 text-sm font-bold outline-none transition-all text-fg-main cursor-pointer" value={val || ''} onChange={e => onChange(e.target.value)}>
            <option value="" disabled>Select...</option>
            {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

export default UserProfileModal;
