
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
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
    content: "生成后，用耳朵听，用嘴巴读。AI 评测会纠正您的发音细节。",
    position: "top"
  },
  {
    target: "settings-btn",
    title: "5. 个性化设置 (Settings)",
    content: "这里有「灵感颗粒」收集您的碎片想法，还能调整发音偏好和意见反馈。",
    position: "bottom-right"
  },
  {
    target: "history-btn",
    title: "6. 历史与备份 (History)",
    content: "查看过往积累的语料，支持生成 P2 故事，记得定期导出 Word 备份哦！",
    position: "bottom-right"
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);
    return () => {
        window.removeEventListener('resize', updateHighlight);
        window.removeEventListener('scroll', updateHighlight);
    };
  }, [currentStep]);

  const updateHighlight = () => {
    // Delay to ensure DOM render
    requestAnimationFrame(() => {
        const id = STEPS[currentStep].target;
        const element = document.getElementById(id);
        if (element) {
            const newRect = element.getBoundingClientRect();
            setRect(newRect);
            // Gentle scroll into view if offscreen
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
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Dark Overlay with cutout using SVG mask for better performance */}
      <div className="absolute inset-0 bg-black/70 transition-opacity duration-500 ease-in-out" 
           style={{ clipPath: rect ? `polygon(
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
      {rect && (
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
      <div className="absolute w-full px-4 flex justify-center pointer-events-none"
           style={{
               top: rect ? (STEPS[currentStep].position === 'top' ? rect.top - 160 : rect.bottom + 24) : '50%',
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
                  <button onClick={onComplete} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
              </div>
              <p className="text-zinc-400 text-sm mb-5 leading-relaxed font-medium">
                  {STEPS[currentStep].content}
              </p>
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
          </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
