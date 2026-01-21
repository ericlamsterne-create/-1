
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, HelpCircle } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
  showDontShowAgain?: boolean;
}

const STEPS = [
  {
    target: "core-phrase-input",
    title: "1. 核心起点 (Start Here)",
    content: "输入想掌握的词组（如 'unwind'）。这是构建语料库的地基。",
    position: "bottom"
  },
  {
    target: "draft-input-0", 
    title: "2. 语境草稿 (Context)",
    content: "在此输入中文想法或英文片段。AI 会基于此生成地道表达。",
    position: "bottom"
  },
  {
    target: "generate-btn-0",
    title: "3. 一键生成 (Generate)",
    content: "点击星光，AI 将结合核心词与您的语境，生成高分例句。",
    position: "left"
  },
  {
    target: "audio-controls-0",
    title: "4. 听音纠错 (Audio & Eval)",
    content: "每日反复跟读/听（优化），AI 评测会纠正您的发音细节。",
    position: "top"
  },
  {
    target: "settings-btn",
    title: "5. 人设与灵感 (Persona & Inspiration)",
    content: "在设置中完善【人设画像】，让 AI 成为你的嘴替；利用【灵感颗粒】记录碎片想法。",
    position: "bottom-right"
  },
  {
    target: "history-btn",
    title: "6. 历史与 P2 (History & Story)",
    content: "回顾练习记录，甚至可以将 P1/P3 的语料一键串联成 P2 故事！支持导出备份。",
    position: "bottom-right"
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, showDontShowAgain = true }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Helper to find target help button for closing animation
  const getHelpButtonRect = () => {
      const btn = document.getElementById('help-btn'); 
      if (btn) return btn.getBoundingClientRect();
      // Fallback to top right
      return { top: 20, right: 20, width: 40, height: 40, left: window.innerWidth - 60, bottom: 60 };
  };

  useEffect(() => {
    if (!isClosing) {
        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        window.addEventListener('scroll', updateHighlight);
    }
    return () => {
        window.removeEventListener('resize', updateHighlight);
        window.removeEventListener('scroll', updateHighlight);
    };
  }, [currentStep, isClosing]);

  const updateHighlight = () => {
    requestAnimationFrame(() => {
        const id = STEPS[currentStep].target;
        const element = document.getElementById(id);
        if (element) {
            const newRect = element.getBoundingClientRect();
            setRect(newRect);
            if (newRect.top < 0 || newRect.bottom > window.innerHeight) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setRect(null);
        }
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
      if (dontShowAgain) {
          localStorage.setItem('lingua_onboarding_done', 'true');
      }
      setIsClosing(true);
      setTimeout(onComplete, 600); // Wait for animation
  };

  const helpRect = getHelpButtonRect();

  // Animation Styles
  const containerStyle = isClosing ? {
      opacity: 0,
      clipPath: `circle(0% at ${helpRect.left + helpRect.width/2}px ${helpRect.top + helpRect.height/2}px)`,
      transition: 'all 0.6s ease-in-out'
  } : {
      opacity: 1,
      clipPath: 'circle(150% at 50% 50%)',
      transition: 'opacity 0.3s ease-out'
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={containerStyle}>
      {/* Dark Overlay with cutout using SVG mask for better performance */}
      <div className="absolute inset-0 bg-black/70 transition-opacity duration-500 ease-in-out" 
           style={{ clipPath: rect && !isClosing ? `polygon(
               0% 0%, 
               0% 100%, 
               100% 100%, 
               100% 0%, 
               0% 0%, 
               ${rect.left}px ${rect.top}px, 
               ${rect.right}px ${rect.top}px, 
               ${rect.right}px ${rect.bottom}px, 
               ${rect.left}px ${rect.bottom}px, 
               ${rect.left}px ${rect.top}px
           )` : 'none' }}
      ></div>

      {/* Highlighter Box */}
      {rect && !isClosing && (
        <div 
            className="absolute border-2 border-green-500 rounded-xl shadow-[0_0_30px_rgba(74,222,128,0.6)] transition-all duration-300 ease-out pointer-events-none"
            style={{
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8
            }}
        >
            <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Content Card */}
      {!isClosing && (
      <div className="absolute w-full px-4 flex justify-center pointer-events-none"
           style={{
               top: rect ? (STEPS[currentStep].position === 'top' ? rect.top - 180 : rect.bottom + 24) : '50%',
               left: 0,
               transition: 'top 0.3s ease-out'
           }}
      >
          <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{currentStep + 1}/{STEPS.length}</span>
                      {STEPS[currentStep].title}
                  </h3>
                  <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
              </div>
              <p className="text-zinc-400 text-sm mb-5 leading-relaxed font-medium">
                  {STEPS[currentStep].content}
              </p>
              
              <div className="flex flex-col gap-4">
                  {/* Progress & Next */}
                  <div className="flex justify-between items-center">
                      <div className="flex gap-1.5">
                          {STEPS.map((_, i) => (
                              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-green-500' : 'w-1.5 bg-zinc-700'}`}></div>
                          ))}
                      </div>
                      <button 
                        onClick={handleNext}
                        className="px-5 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-white/10"
                      >
                        {currentStep === STEPS.length - 1 ? '开始探索' : '下一步'} <ArrowRight className="w-3 h-3"/>
                      </button>
                  </div>

                  {/* Don't show again checkbox (Only on last step or first) */}
                  {showDontShowAgain && (
                      <div className="pt-2 border-t border-zinc-800 flex items-center gap-2 cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-green-600 border-green-600' : 'border-zinc-600'}`}>
                              {dontShowAgain && <Check className="w-3 h-3 text-white"/>}
                          </div>
                          <span className="text-xs text-zinc-500 font-bold select-none">下次不再自动弹出此教程</span>
                      </div>
                  )}
              </div>
          </div>
      </div>
      )}
      
      {/* Animation Ghost when closing */}
      {isClosing && (
          <div 
            className="fixed z-[10000] bg-green-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ease-in-out"
            style={{
                top: helpRect.top,
                left: helpRect.left,
                width: helpRect.width,
                height: helpRect.height,
                opacity: 0.5,
                transform: 'scale(1.5)'
            }}
          >
              <HelpCircle className="w-6 h-6 text-white animate-ping"/>
          </div>
      )}
    </div>
  );
};

export default OnboardingTour;
