
import React, { useState } from 'react';
import { X, BookOpen, Edit3, History, Settings, Sparkles, Brain, FileUp, Download, ArrowRight, Check, Upload, FileText } from 'lucide-react';
import { exportTemplate, importHistoryFromWord } from '../services/documentService';
import { SentenceData } from '../types';

interface UserGuideModalProps {
    onClose: () => void;
    onImportToPractice?: (sentences: SentenceData[], topic: string) => void;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose, onImportToPractice }) => {
    const [activeSection, setActiveSection] = useState<'practice' | 'formula' | 'history' | 'persona' | 'settings' | 'custom'>('practice');
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('lingua_suppress_guide', 'true');
        }
        onClose();
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImportToPractice) return;
        try {
            // Re-use existing parser but extract for practice
            const { sessions } = await importHistoryFromWord(file, []);
            if (sessions.length > 0) {
                const latest = sessions[0];
                onImportToPractice(latest.sentences, latest.topicLabel);
                onClose(); // Close guide to show result
            } else {
                alert("未在文档中找到有效内容，请确保使用了标准模版。");
            }
        } catch (err: any) {
            alert("导入失败: " + err.message);
        }
        e.target.value = '';
    };

    const renderContent = () => {
        switch(activeSection) {
            case 'practice':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4"/> 核心流程</h4>
                            <p className="text-sm text-blue-700 leading-relaxed">
                                选择话题类型 (如 Why 类) ➡️ 输入你的中文想法或英文关键词 ➡️ AI 结合公式生成地道回答 ➡️ 跟读录音并获得评分。
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">1</div>
                                <div>
                                    <h5 className="font-bold text-slate-800">选择话题 (Topic Selection)</h5>
                                    <p className="text-sm text-slate-500 mt-1">
                                        在主页选择一种问题类型（如 "喜好类"）。系统会自动为你准备相关的 Part 1/Part 3 问题。
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">2</div>
                                <div>
                                    <h5 className="font-bold text-slate-800">输入草稿 (Draft Input)</h5>
                                    <p className="text-sm text-slate-500 mt-1">
                                        在文本框中输入你的回答思路。支持中文！例如：“我喜欢听音乐，因为很放松。” AI 会自动翻译并润色。
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">3</div>
                                <div>
                                    <h5 className="font-bold text-slate-800">AI 生成与优化 (Generate)</h5>
                                    <p className="text-sm text-slate-500 mt-1">
                                        点击 ✨ 生成按钮。AI 将根据当前页面的“公式句”重组你的内容，生成高分表达。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'custom':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><FileUp className="w-4 h-4"/> 自定义内容 (Custom Content)</h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                上传您自己的语料进行练习。导入的内容将显示在练习界面，您可以对其进行听音、跟读、AI 润色及语法修正，并支持导出音频。
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Step 1: Download */}
                            <div className="bg-white border-2 border-slate-100 p-6 rounded-3xl flex flex-col items-center text-center hover:border-blue-100 transition-all">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
                                    <FileText className="w-6 h-6"/>
                                </div>
                                <h5 className="font-bold text-slate-800 mb-2">1. 下载标准模版</h5>
                                <p className="text-xs text-slate-500 mb-4 h-10">
                                    请使用标准 Word (.docx) 格式填写您的问题和答案。
                                </p>
                                <button 
                                    onClick={exportTemplate}
                                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Download className="w-4 h-4"/> 下载模版
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div className="bg-white border-2 border-slate-100 p-6 rounded-3xl flex flex-col items-center text-center hover:border-green-100 transition-all">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-green-500">
                                    <Upload className="w-6 h-6"/>
                                </div>
                                <h5 className="font-bold text-slate-800 mb-2">2. 导入并练习</h5>
                                <p className="text-xs text-slate-500 mb-4 h-10">
                                    上传填好的文档，系统将自动生成练习卡片。
                                </p>
                                <label className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-green-200">
                                    <FileUp className="w-4 h-4"/> 选择文件导入
                                    <input type="file" onChange={handleFileImport} className="hidden" accept=".docx"/>
                                </label>
                            </div>
                        </div>

                        <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-100">
                            * 支持功能：听音 (Listen) · 跟读 (Speak) · 编辑 (Edit) · 语法修正 (Fix) · AI 润色 (Polish) · 音频下载
                        </div>
                    </div>
                );
            case 'persona':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><Brain className="w-4 h-4"/> 什么是数字人设？</h4>
                            <p className="text-sm text-purple-700 leading-relaxed">
                                雅思口语考试需要展现真实的交流能力。通过配置“人设”，AI 不会生成千篇一律的模板答案，而是基于你的真实身份（学生/工作党）、爱好、习惯来生成内容。
                            </p>
                        </div>
                        <ul className="space-y-4 text-sm text-slate-600">
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong className="text-slate-900 block mb-1">身份 (Identity):</strong>
                                告诉 AI 你的专业或工作。
                            </li>
                            <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong className="text-slate-900 block mb-1">性格与习惯 (Habits):</strong>
                                设定你是“早起鸟”还是“夜猫子”，这决定了 AI 回答生活类问题时的逻辑。
                            </li>
                        </ul>
                    </div>
                );
            case 'formula':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Edit3 className="w-4 h-4"/> 自定义公式</h4>
                            <p className="text-sm text-indigo-700 leading-relaxed">
                                觉得默认公式太难？你可以随时修改它。修改后的公式将直接影响 AI 的生成逻辑。
                            </p>
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><History className="w-4 h-4"/> 复习队列 (Review Queue)</h4>
                            <p className="text-sm text-green-700 leading-relaxed">
                                可以在历史记录中选中多个句子，进入沉浸式复习模式。
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                <h5 className="font-bold text-slate-800 mb-1">自动间隔播放</h5>
                                <p className="text-xs text-slate-500">
                                    复习播放器会自动执行：<strong>播放问题 ➡️ 停顿 1 秒 ➡️ 播放回答</strong> 的循环。
                                </p>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                <h5 className="font-bold text-slate-800 mb-1">导出资料</h5>
                                <p className="text-xs text-slate-500">
                                    支持导出音频文件（MP3/WAV）以及简单的 Word 文档以便打印背诵。
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> 个性化设置</h4>
                            <p className="text-sm text-orange-700 leading-relaxed">
                                打造适合你的学习环境。
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-duo-green"/> 使用指南
                    </h3>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500"/>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-full md:w-48 bg-slate-50 p-4 border-r border-slate-100 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0">
                        <NavButton active={activeSection === 'practice'} onClick={() => setActiveSection('practice')} icon={<Sparkles className="w-4 h-4"/>} label="核心练习" />
                        <NavButton active={activeSection === 'custom'} onClick={() => setActiveSection('custom')} icon={<FileUp className="w-4 h-4"/>} label="自定义内容" />
                        <NavButton active={activeSection === 'persona'} onClick={() => setActiveSection('persona')} icon={<Brain className="w-4 h-4"/>} label="数字人设" />
                        <NavButton active={activeSection === 'formula'} onClick={() => setActiveSection('formula')} icon={<Edit3 className="w-4 h-4"/>} label="公式编辑" />
                        <NavButton active={activeSection === 'history'} onClick={() => setActiveSection('history')} icon={<History className="w-4 h-4"/>} label="复习模式" />
                        <NavButton active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} icon={<Settings className="w-4 h-4"/>} label="设置选项" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                        {renderContent()}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${dontShowAgain ? 'bg-duo-green border-duo-green' : 'border-slate-300 bg-white group-hover:border-duo-green/50'}`}>
                            {dontShowAgain && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">下次不再自动弹出</span>
                    </label>

                    <button onClick={handleClose} className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg w-full sm:w-auto">
                        明白
                    </button>
                </div>
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left whitespace-nowrap
            ${active ? 'bg-white text-duo-green shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
        `}
    >
        {icon}
        <span>{label}</span>
        {active && <ArrowRight className="w-3 h-3 ml-auto opacity-50 hidden md:block"/>}
    </button>
);

const CheckIcon = () => (
    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    </div>
);

export default UserGuideModal;
