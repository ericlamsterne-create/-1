
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signOut as firebaseSignOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    User 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { Session, P2Session, UserProfile } from '../types';

// =========================================================================
// 📘 部署说明 (DEPLOYMENT GUIDE)
// =========================================================================
// 本应用设计为“双模”运行：
// 1. 本地模式 (默认): 无需配置任何 Key，数据存储在浏览器 LocalStorage 中。
// 2. 云端模式 (可选): 配置以下环境变量以启用多设备同步。
//
// 如何配置 (以 Vercel/Netlify 为例):
// 在项目设置的 "Environment Variables" 中添加以下键值对:
// - FIREBASE_API_KEY
// - FIREBASE_AUTH_DOMAIN
// - FIREBASE_PROJECT_ID
// - FIREBASE_STORAGE_BUCKET
// - FIREBASE_MESSAGING_SENDER_ID
// - FIREBASE_APP_ID
// =========================================================================

// Helper to safely access env vars without crashing in browser-native ESM
const getEnv = (key: string) => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) {}
    return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || "YOUR_API_KEY_HERE",
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || "your-project-id.firebaseapp.com",
  projectId: getEnv('FIREBASE_PROJECT_ID') || "your-project-id",
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || "your-project-id.appspot.com",
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || "1234567890",
  appId: getEnv('FIREBASE_APP_ID') || "1:1234567890:web:abcdef123456"
};

// Check if configured (Simple check: key is not the placeholder)
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
                             !firebaseConfig.apiKey.includes("YOUR_API_KEY") &&
                             !!firebaseConfig.apiKey;

// Initialize Firebase only if configured
let app;
let auth: any;
let db: any;

try {
    if (isFirebaseConfigured) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("☁️ LinguaFlow: Cloud Sync Enabled (Firebase Connected)");
    } else {
        // Log as Info/Success instead of Warning/Error to avoid confusion
        console.log("✅ LinguaFlow: Running in Offline Mode (Local Storage). App is ready.");
    }
} catch (e) {
    console.warn("Firebase init warning (switching to offline mode):", e);
}

// --- MOCK MODE STATE (Local Storage Implementation) ---
// Key: lingua_mock_users -> { "featureCode": { uid, featureCode, ... } }
let currentMockUser: User | null = null;
const mockObservers: ((user: User | null) => void)[] = [];

// Try to restore mock session
try {
    const savedSession = localStorage.getItem('lingua_mock_session');
    if (savedSession && !isFirebaseConfigured) {
        currentMockUser = JSON.parse(savedSession);
    }
} catch(e) {}

function notifyMockObservers() {
    mockObservers.forEach(cb => cb(currentMockUser));
}

// --- AUTH SERVICES (Feature Code) ---

const getCredentialsFromCode = (code: string) => {
    const safeCode = code.trim().replace(/\s+/g, '');
    return {
        email: `${safeCode}@linguaflow.sync`,
        password: `lf_sync_${safeCode}_secure_suffix` 
    };
};

export const loginWithFeatureCode = async (code: string): Promise<User> => {
    if (!code) throw new Error("请输入同步码");

    if (!isFirebaseConfigured) {
        // MOCK LOGIN
        await new Promise(r => setTimeout(r, 800));
        const users = JSON.parse(localStorage.getItem('lingua_mock_users') || '{}');
        
        let user = users[code];
        if (!user) {
            // Auto-register if new code in mock mode
            user = {
                uid: 'local-' + code + '-' + Date.now(),
                email: `${code}@local.dev`,
                displayName: `User ${code}`,
                photoURL: `https://ui-avatars.com/api/?name=${code}&background=random`,
                emailVerified: true,
                isAnonymous: false
            };
            users[code] = user;
            localStorage.setItem('lingua_mock_users', JSON.stringify(users));
        }

        currentMockUser = user as unknown as User;
        localStorage.setItem('lingua_mock_session', JSON.stringify(user));
        notifyMockObservers();
        return currentMockUser;
    }

    // REAL FIREBASE LOGIN
    const { email, password } = getCredentialsFromCode(code);

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                const registerResult = await createUserWithEmailAndPassword(auth, email, password);
                return registerResult.user;
            } catch (regError: any) {
                console.error("Registration via code failed", regError);
                throw new Error("无法创建同步账户: " + regError.message);
            }
        }
        console.error("Login via code failed", error);
        throw error;
    }
};

export const signOut = async () => {
    if (!isFirebaseConfigured) {
        console.log("[Local] Signing out...");
        currentMockUser = null;
        localStorage.removeItem('lingua_mock_session');
        notifyMockObservers();
        return;
    }

    if (!auth) return;
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!isFirebaseConfigured) {
        mockObservers.push(callback);
        callback(currentMockUser); // Initial state
        return () => {
            const idx = mockObservers.indexOf(callback);
            if (idx > -1) mockObservers.splice(idx, 1);
        };
    }

    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
};

// --- DATA SYNC SERVICES ---

export interface CloudData {
    userProfile: UserProfile;
    history: Session[];
    p2History: P2Session[];
    lastUpdated?: any;
}

export const saveUserDataToCloud = async (
    userId: string, 
    data: { userProfile: UserProfile; history: Session[]; p2History: P2Session[] }
) => {
    if (!isFirebaseConfigured) {
        // MOCK SAVE
        localStorage.setItem(`lingua_mock_db_${userId}`, JSON.stringify({
            ...data,
            lastUpdated: { seconds: Date.now() / 1000, nanoseconds: 0 }
        }));
        return;
    }

    if (!db) return;
    try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
            ...data,
            lastUpdated: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Cloud sync failed", e);
    }
};

export const loadUserDataFromCloud = async (userId: string): Promise<Partial<CloudData> | null> => {
    if (!isFirebaseConfigured) {
        // MOCK LOAD
        const raw = localStorage.getItem(`lingua_mock_db_${userId}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        return raw ? JSON.parse(raw) : null;
    }

    if (!db) return null;
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as Partial<CloudData>;
        }
        return null;
    } catch (e) {
        console.error("Cloud load failed", e);
        return null;
    }
};
