
export interface SentenceData {
  type: string; 
  content: string;
  draftInput: string;
  patterns?: string[]; 
  ieltsTopic?: string; 
  logic?: string; // Enhanced to be visual/symbolic
  formulaId?: string; // Track which formula was used
  questionSource?: string; // e.g. "Part 3"
}

export interface UserAudio {
  id: string;
  label: string;
  data: string; 
  isProfile?: boolean; 
  voiceSettings?: {
    pitch: number; 
    baseVoice: string; 
  };
}

export interface Session {
  id: string;
  timestamp: number;
  corePhrase: string;
  exampleSentence?: string; // Added to persist the source/example sentence
  sentences: SentenceData[]; 
  userAudios: UserAudio[]; 
}

export interface P2Session {
    id: string;
    timestamp: number;
    topic: string;
    content: string;
    logic: string;
    corePhrases: string[];
}

export interface WordDefinition {
  word: string;
  ipa: string;
  definition: string; 
}

export interface UserProfile {
  name: string;
  role: string; 
  interests: string; 
  people: string; 
  goals: string; 
  // englishLevel removed
  targetScoreSpeaking: string; 
  targetScoreWriting: string; 
  targetScore: string; // Legacy
  favoriteTopics: string; // Changed label to "Strong Topics" in UI
  importantExperiences: string; 
  invitationCode?: string; 
  inspiration?: string; 
  // Voice Settings moved here
  preferredAccent: AccentType;
  preferredVoiceId: string;
  playbackSpeed: number; // Global playback speed preference
  useGoldenFormulas?: boolean; // New setting
}

export const DEFAULT_SENTENCE_TYPES = [
  "Speaking Part 1",
  "Speaking Part 1 & 3",
  "Speaking Part 3 / Writing Task 2"
];

export enum AccentType {
  US = 'US',
  UK = 'UK'
}

export interface VoiceOption {
  id: string;
  label: string;
  geminiVoiceName?: string; 
  isUser?: boolean;
  audioData?: string; 
  isProfile?: boolean;
  voiceSettings?: {
    pitch: number;
    baseVoice: string;
  };
}

export interface SynonymSuggestion {
  original: string;
  replacements: string[];
}

export interface PronunciationResult {
  score: number;
  feedback: string;
  mistakes: string[];
  audioBlob?: Blob; 
}

// New Interface for P2 Result to include logic
export interface P2Result {
    title: string;
    content: string;
    logic: string; // Visual memory hooks
}
