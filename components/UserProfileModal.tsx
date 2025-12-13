
import React, { useState, useEffect } from 'react';
import { UserProfile, AccentType } from '../types';
import { UserCircle, X, Check, Save, Target, Heart, Briefcase, Key, Sparkles, Settings, Volume2, Book, Gauge, Mail, Upload, Download, Wand2, Loader2, FileText, Send } from 'lucide-react';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';
import { refineInspiration, analyzeFeedback } from '../services/geminiService';
import { exportInspirationToWord, importInspirationFromWord } from '../services/documentService';

interface UserProfileModalProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ initialProfile, onSave, onClose }) => {
  const [profile, setProfile] = useState<UserProfile>({
      ...initialProfile,
      playbackSpeed: initialProfile.playbackSpeed || 1.0
  });
  
  // Separate state for the input box vs the stored library
  const [inspirationInput, setInspirationInput] = useState("");
  
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState(false);
  const [aiPromptAdvice, setAiPromptAdvice] = useState<string | null>(null);

  useEffect(() => {
      if (profile.invitationCode && profile.invitationCode.toLowerCase() === 'linguaflow666888') {
          setCodeValid(true);
      }
  }, []);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    
    if (field === 'invitationCode') {
        if (typeof value === 'string' && value.toLowerCase() === 'linguaflow666888') {
            setCodeValid(true);
        } else if (typeof value === 'string' && value.length > 0) {
            setCodeValid(false);
        } else {
            setCodeValid(null);
        }
    }
  };

  const handleSubmit = () => {
    onSave(profile);
    onClose();
  };

  // Workflow: Refine Input -> Add to Library -> Clear Input (No Auto Download)
  const handleRefineAndSave = async () => {
      if (!inspirationInput.trim()) return;
      setIsRefining(true);
      try {
          // 1. Refine
          const refined = await refineInspiration(inspirationInput);
          
          // 2. Add to internal library (profile)
          const timestamp = new Date().toLocaleDateString();
          const entry = `[${timestamp}] ${refined}`;
          const newLibrary = (profile.inspiration ? profile.inspiration + "\n\n" : "") + entry;
          setProfile(prev => ({ ...prev, inspiration: newLibrary }));
          
          // 3. Clear Input (Removed auto-export)
          setInspirationInput("");
          // Feedback to user
      } catch (e) {
          alert("整理失败，请重试");
      } finally {
          setIsRefining(false);
      }
  };

  const handleImportInspiration = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const text = await importInspirationFromWord(file);
          setProfile(prev => ({ 
              ...prev, 
              inspiration: (prev.inspiration ? prev.inspiration + "\n\n" : "") + text 
          }));
          alert("导入成功！已合并至灵感库。");
      } catch (err: any) {
          alert("导入失败: " + err.message);
      }
      e.target.value = '';
  };

  const handleFeedbackSubmit = async () => {
      if(!feedback.trim()) return;
      
      // 1. Open Mail Client
      window.location.href = `mailto:724959739@qq.com?subject=LinguaFlow Feedback&body=${encodeURIComponent(feedback)}`;
      
      // 2. AI Analysis for Prompt Improvement
      setIsAnalyzingFeedback(true);
      try {
          const advice = await analyzeFeedback(feedback);
          setAiPromptAdvice(advice);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzingFeedback(false);
      }
  };

  const currentVoices = profile.preferredAccent === AccentType.US ? VOICES_US_PRESET : VOICES_UK_PRESET;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-green-500"/> 设置
            </h3>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5"/>
            </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            
            {/* 1. Inspiration Pad (Moved to Top) */}
            <div className="space-y-3 p-4 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 rounded-2xl border border-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.05)]">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3 h-3"/> 灵感颗粒
                    </h4>
                    <div className="flex gap-2">
                         <label className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 cursor-pointer transition-colors" title="导入 Word">
                             <Upload className="w-3 h-3"/>
                             <input type="file" className="hidden" accept=".docx" onChange={handleImportInspiration}/>
                         </label>
                         {/* Manual export of whole library */}
                         <button onClick={() => exportInspirationToWord(profile.inspiration || "")} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 transition-colors" title="导出全部">
                             <Download className="w-3 h-3"/>
                         </button>
                    </div>
                </div>
                
                {/* Input Area */}
                <div className="relative">
                    <textarea 
                        value={inspirationInput}
                        onChange={(e) => setInspirationInput(e.target.value)}
                        placeholder="在此输入零碎想法、中文词汇或英文片段..."
                        rows={3}
                        className="w-full bg-zinc-950/80 border border-green-900/30 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none transition-colors resize-none mb-2"
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={handleRefineAndSave} 
                            disabled={isRefining || !inspirationInput.trim()}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg ${isRefining ? 'bg-zinc-800 text-zinc-500' : 'bg-green-600 text-white hover:bg-green-500'}`}
                        >
                            {isRefining ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>} 
                            AI 整理并录入
                        </button>
                    </div>
                </div>

                {/* Library Preview (Simplified) */}
                {profile.inspiration && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        <div className="flex justify-between items-baseline mb-1">
                             <span className="text-[10px] text-zinc-500 font-bold uppercase">已录入 (Recorded)</span>
                        </div>
                        <div className="text-xs text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed px-1">
                            {profile.inspiration}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Voice Settings */}
            <div className="space-y-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Volume2 className="w-3 h-3"/> 语音设置
                </h4>
                <div className="flex gap-2 mb-2">
                    <button 
                        onClick={() => handleChange('preferredAccent', AccentType.US)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${profile.preferredAccent === AccentType.US ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        🇺🇸 美式发音
                    </button>
                    <button 
                         onClick={() => handleChange('preferredAccent', AccentType.UK)}
                         className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${profile.preferredAccent === AccentType.UK ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        🇬🇧 英式发音
                    </button>
                </div>
                <select 
                    value={profile.preferredVoiceId || currentVoices[0].id}
                    onChange={(e) => handleChange('preferredVoiceId', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-green-500 mb-3"
                >
                    {currentVoices.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                </select>

                <div className="flex items-center gap-3">
                     <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0"><Gauge className="w-3 h-3"/> 语速 (Speed): {profile.playbackSpeed}x</span>
                     <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1" 
                        value={profile.playbackSpeed}
                        onChange={(e) => handleChange('playbackSpeed', parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-700 rounded-lg accent-green-500 cursor-pointer"
                    />
                </div>
            </div>

            {/* 3. Formula Settings */}
            <div className="space-y-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <h4 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Book className="w-3 h-3"/> 句式设置
                </h4>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">启用 14 组万能句式</span>
                    <button 
                        onClick={() => handleChange('useGoldenFormulas', !(profile.useGoldenFormulas !== false))}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${profile.useGoldenFormulas !== false ? 'bg-green-600' : 'bg-zinc-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${profile.useGoldenFormulas !== false ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                <p className="text-[10px] text-zinc-500">开启后，AI 将强制使用特定的高分句型结构（如强调句、倒装句等）来生成答案，避免句式单一。</p>
            </div>

            {/* 4. Basic Info */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase className="w-3 h-3"/> 基础背景
                </h4>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">身份/职业</label>
                    <input 
                        type="text" 
                        value={profile.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        placeholder="例如: 软件工程师, 学生..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 outline-none transition-colors"
                    />
                </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">重要人物</label>
                    <input 
                        type="text" 
                        value={profile.people}
                        onChange={(e) => handleChange('people', e.target.value)}
                        placeholder="例如: 哥哥 Tom, 经理..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 outline-none transition-colors"
                    />
                </div>
            </div>

            {/* 5. Learning Goals */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Target className="w-3 h-3"/> 雅思目标
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">口语目标</label>
                        <select 
                            value={profile.targetScoreSpeaking || "6.5"}
                            onChange={(e) => handleChange('targetScoreSpeaking', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                            <option value="5.5">5.5</option>
                            <option value="6.0">6.0</option>
                            <option value="6.5">6.5</option>
                            <option value="7.0">7.0</option>
                            <option value="7.5+">7.5+</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">写作目标</label>
                        <select 
                            value={profile.targetScoreWriting || "6.5"}
                            onChange={(e) => handleChange('targetScoreWriting', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                            <option value="5.5">5.5</option>
                            <option value="6.0">6.0</option>
                            <option value="6.5">6.5</option>
                            <option value="7.0">7.0</option>
                            <option value="7.5+">7.5+</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 6. Interests */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Heart className="w-3 h-3"/> 兴趣偏好
                </h4>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">兴趣爱好</label>
                    <textarea 
                        value={profile.interests}
                        onChange={(e) => handleChange('interests', e.target.value)}
                        placeholder="例如: 徒步, 摄影, 烹饪..."
                        rows={2}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 outline-none transition-colors resize-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">擅长话题</label>
                    <input 
                        type="text" 
                        value={profile.favoriteTopics || ""}
                        onChange={(e) => handleChange('favoriteTopics', e.target.value)}
                        placeholder="例如: 科技, 环境, 商业..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 outline-none transition-colors"
                    />
                </div>
            </div>

             {/* 7. Invitation Code */}
             <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Key className="w-3 h-3"/> 邀请码 (解除限额)
                </h4>
                <div className="relative">
                    <input 
                        type="text" 
                        value={profile.invitationCode || ""}
                        onChange={(e) => handleChange('invitationCode', e.target.value)}
                        placeholder="请输入邀请码以解除限额..."
                        className={`w-full bg-zinc-800 border rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors pr-10
                            ${codeValid === true ? 'border-green-500 focus:border-green-500' : codeValid === false ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-yellow-500'}
                        `}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codeValid === true && <Check className="w-4 h-4 text-green-500"/>}
                        {codeValid === false && <X className="w-4 h-4 text-red-500"/>}
                    </div>
                </div>
                 {codeValid === true && (
                     <p className="text-[10px] text-green-500 font-bold">已激活无限额度权限！</p>
                 )}
            </div>

            {/* 8. Feedback Board */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="w-3 h-3"/> 意见反馈
                </h4>
                <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="您遇到的问题或建议..."
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white outline-none transition-colors resize-none"
                />
                <button 
                    onClick={handleFeedbackSubmit}
                    disabled={!feedback.trim() || isAnalyzingFeedback}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isAnalyzingFeedback ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                    发送邮件反馈
                </button>
                {aiPromptAdvice && (
                    <div className="mt-2 p-3 bg-green-900/10 border border-green-900/30 rounded-lg">
                        <div className="text-[10px] font-bold text-green-500 mb-1">AI 针对建议的提示词优化方案：</div>
                        <div className="text-xs text-zinc-400 leading-relaxed font-mono">{aiPromptAdvice}</div>
                    </div>
                )}
            </div>

        </div>

        <div className="mt-6 shrink-0">
            <button 
                onClick={handleSubmit}
                className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
            >
                <Save className="w-5 h-5"/> 保存设置
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
