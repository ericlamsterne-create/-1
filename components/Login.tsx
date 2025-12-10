import React from 'react';
import { MessageCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="bg-zinc-900 p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border border-zinc-800">
        <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">LinguaFlow</h1>
            <p className="text-zinc-500 text-sm">打造您的专属口语语料库</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-zinc-900 font-bold py-3.5 px-4 rounded-2xl transition-all shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Google 账号登录
          </button>
          
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-zinc-800 text-white border border-zinc-700 font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.81.04 2.39-.79 3.71-.65.61.03 2.22.25 3.32 1.86-2.88 1.69-2.39 5.38.3 6.51-.55 1.57-1.37 3.14-2.41 4.47zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple 账号登录
          </button>

          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#07C160] hover:bg-[#06ad56] text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-[#07C160]/20"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            微信一键登录
          </button>
        </div>
        <p className="mt-8 text-xs text-zinc-600">
            登录即代表您同意服务条款和隐私政策。
        </p>
      </div>
    </div>
  );
};

export default Login;