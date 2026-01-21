
import React, { useState } from 'react';
import { Cloud, Loader2, X, AlertCircle, Key, DownloadCloud, HardDrive, ArrowRightLeft } from 'lucide-react';
import { loginWithFeatureCode, loadUserDataFromCloud } from '../services/firebase';
import { CloudData } from '../services/firebase';

interface LoginProps {
  onClose: () => void;
  onLoginSuccess: (user: any, cloudData: CloudData | null) => void;
}

const Login: React.FC<LoginProps> = ({ onClose, onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCode, setFeatureCode] = useState("");
  const [cloudDataFound, setCloudDataFound] = useState<CloudData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!featureCode || featureCode.length < 4) { 
          setError("Feature code must be at least 4 characters"); 
          return; 
      }

      setIsLoading(true);
      setError(null);

      try {
          const user = await loginWithFeatureCode(featureCode);
          setCurrentUser(user);
          
          // Check for existing data
          const data = await loadUserDataFromCloud(user.uid);
          if (data && (data.history?.length || data.userProfile)) {
              setCloudDataFound(data as CloudData);
          } else {
              // No data, just login
              onLoginSuccess(user, null);
              onClose();
          }
      } catch (err: any) {
          const msg = err.message || err.toString();
          setError(msg);
      } finally {
          setIsLoading(false);
      }
  };

  const handleCloudDecision = (useCloud: boolean) => {
      if (useCloud && cloudDataFound) {
          onLoginSuccess(currentUser, cloudDataFound);
      } else {
          onLoginSuccess(currentUser, null); // Keep local state (will eventually overwrite cloud on next sync)
      }
      onClose();
  };

  if (cloudDataFound) {
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-sans overflow-hidden bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="glass-panel p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-slide-up border-2 border-white/50 bg-white/95 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200">
                    <DownloadCloud className="w-8 h-8 text-green-600"/>
                </div>
                <h2 className="text-2xl font-black text-fg-main mb-2">Cloud Data Found!</h2>
                <p className="text-fg-muted text-sm mb-6">
                    We found a backup linked to this Feature Code. Would you like to download it?
                </p>
                
                <div className="space-y-3">
                    <button onClick={() => handleCloudDecision(true)} className="w-full py-4 bg-duo-green hover:bg-green-600 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 border-b-4 border-duo-greenDark active:border-b-0 active:translate-y-1">
                        <DownloadCloud className="w-5 h-5"/> Download Cloud Data
                    </button>
                    <button onClick={() => handleCloudDecision(false)} className="w-full py-4 bg-bg-card border-2 border-border hover:bg-bg-hover text-fg-main font-bold rounded-xl flex items-center justify-center gap-2 border-b-4 active:border-b-2 active:translate-y-0.5">
                        <HardDrive className="w-5 h-5"/> Keep Local Data
                    </button>
                </div>
                <div className="mt-4 text-[10px] text-fg-sub">
                    *Downloading will overwrite current local history.
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-sans overflow-hidden bg-black/60 backdrop-blur-md animate-fade-in">
      
      <div className="glass-panel p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-slide-up border-2 border-white/50 bg-white/95">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5"/>
        </button>

        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-duo-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-duo-blue/20">
                <Cloud className="w-8 h-8 text-duo-blue"/>
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight text-fg-main">
              Cloud Sync
            </h1>
            <p className="text-fg-muted text-sm font-bold max-w-[280px] mx-auto leading-relaxed">
               Sync your progress across devices using your unique Feature Code.
            </p>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs font-bold text-red-500 animate-pulse">
                <AlertCircle className="w-4 h-4"/> {error}
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-duo-blue transition-colors"/>
                <input 
                    type="text" 
                    placeholder="Enter Feature Code (e.g. Phone #)" 
                    className="w-full bg-bg-input border-2 border-transparent focus:border-duo-blue/50 rounded-2xl py-4 pl-12 pr-4 font-black outline-none transition-all text-lg tracking-wide text-center"
                    value={featureCode}
                    onChange={e => setFeatureCode(e.target.value)}
                    autoFocus
                />
            </div>

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-duo-blue hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95 flex items-center justify-center gap-2 border-b-4 border-duo-blueDark active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Sync Data'}
            </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-xs text-fg-sub font-bold">
                Local progress is saved automatically.<br/>
                Only use this to restore or sync.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
