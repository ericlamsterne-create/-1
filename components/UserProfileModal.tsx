import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { UserCircle, X, Check, Save, GraduationCap, Target, Heart, Briefcase } from 'lucide-react';

interface UserProfileModalProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ initialProfile, onSave, onClose }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCircle className="w-6 h-6 text-green-500"/> 个人资料设置
            </h3>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5"/>
            </button>
        </div>
        
        <p className="text-zinc-500 text-xs mb-4 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800 shrink-0">
            AI 将根据您的资料生成符合您雅思水平（或目标分数）的例句，并结合您的背景进行个性化定制。
        </p>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            
            {/* Basic Info Section */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-green-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <UserCircle className="w-3 h-3"/> 基础背景
                </h4>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">身份/职业 (Role)</label>
                    <input 
                        type="text" 
                        value={profile.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        placeholder="例如: Software Engineer, Student..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 outline-none transition-colors"
                    />
                </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">重要人物 (People)</label>
                    <input 
                        type="text" 
                        value={profile.people}
                        onChange={(e) => handleChange('people', e.target.value)}
                        placeholder="例如: My brother Tom, My manager..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 outline-none transition-colors"
                    />
                </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">重要经历 (Experiences)</label>
                    <textarea 
                        value={profile.importantExperiences || ""}
                        onChange={(e) => handleChange('importantExperiences', e.target.value)}
                        placeholder="例如: Studied in UK for 2 years, Won a coding competition..."
                        rows={2}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-green-500 outline-none transition-colors resize-none"
                    />
                </div>
            </div>

            {/* Learning Goals Section */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Target className="w-3 h-3"/> 学习目标 (IELTS/Speaking)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">当前水平 (Level)</label>
                        <select 
                            value={profile.englishLevel || "Intermediate"}
                            onChange={(e) => handleChange('englishLevel', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                            <option value="Beginner">入门 (Beginner)</option>
                            <option value="Intermediate">中级 (Intermediate)</option>
                            <option value="Advanced">高级 (Advanced)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">目标分数 (Target)</label>
                        <select 
                            value={profile.targetScore || "6.5"}
                            onChange={(e) => handleChange('targetScore', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                            <option value="5.5">IELTS 5.5</option>
                            <option value="6.0">IELTS 6.0</option>
                            <option value="6.5">IELTS 6.5</option>
                            <option value="7.0">IELTS 7.0</option>
                            <option value="7.5+">IELTS 7.5+</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">具体目标 (Specific Goals)</label>
                    <input 
                        type="text" 
                        value={profile.goals}
                        onChange={(e) => handleChange('goals', e.target.value)}
                        placeholder="例如: Improve pronunciation, Learn idioms..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-3 p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/50">
                <h4 className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Heart className="w-3 h-3"/> 兴趣偏好
                </h4>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">兴趣爱好 (Interests)</label>
                    <textarea 
                        value={profile.interests}
                        onChange={(e) => handleChange('interests', e.target.value)}
                        placeholder="例如: Hiking, Photography, Cooking..."
                        rows={2}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 outline-none transition-colors resize-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">常聊话题 (Favorite Topics)</label>
                    <input 
                        type="text" 
                        value={profile.favoriteTopics || ""}
                        onChange={(e) => handleChange('favoriteTopics', e.target.value)}
                        placeholder="例如: Technology, Environment, Business..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 outline-none transition-colors"
                    />
                </div>
            </div>

        </div>

        <div className="mt-6 shrink-0">
            <button 
                onClick={handleSubmit}
                className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
            >
                <Save className="w-5 h-5"/> 保存资料
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;