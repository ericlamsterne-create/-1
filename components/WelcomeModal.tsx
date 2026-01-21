
import React from 'react';
import { X, Sparkles, Brain, Wand2, History, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const handleStart = () => {
        localStorage.setItem('lingua_onboarding_done', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-[600px] rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#22C55E] p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
                        <X className="w-5 h-5 text-white"/>
                    </button>
                    <h2 className="text-3xl font-black mb-2 tracking-tight">Welcome to Ieltsformula</h2>
                    <p className="text-green-100 font-bold opacity-90">Your AI-Powered IELTS Speaking Partner</p>
                </div>

                {/* Content List */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                    
                    {/* Item 1 */}
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                            <Sparkles className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">1. Smart Sentence Building</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Select a topic (e.g., "Why"), input your raw thoughts (Chinese supported!), and let AI restructure them using high-score formulas.
                            </p>
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                            <Brain className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">2. Digital Persona (人设)</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Configure your <strong>Persona</strong> in Settings. The AI will adopt your identity (major, hobbies, habits) to generate authentic, personalized answers automatically.
                            </p>
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 text-orange-600">
                            <Wand2 className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">3. Inspiration Particles (灵感)</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Use the <strong>Inspiration</strong> tab to capture random ideas or phrases. The AI will refine and store them to use as material for your answers.
                            </p>
                        </div>
                    </div>

                    {/* Item 4 */}
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                            <History className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">4. Review History</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Go to <strong>History</strong>, select your practiced sentences to enter "Review Mode". Features auto-play with intervals for efficient review.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={handleStart} 
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Start Practicing <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
