export interface SentenceData {
  type: string; 
  content: string;
  draftInput: string;
  patterns?: string[]; // Array of identified common english patterns/idioms
}

export interface UserAudio {
  id: string;
  label: string;
  data: string; // Base64 DataURL or "AI_PROFILE" marker
  isProfile?: boolean; // If true, this is a trained voice profile, not a simple recording
  voiceSettings?: {
    pitch: number; // Detune value
    baseVoice: string; // Gemini voice to base on
  };
}

export interface Session {
  id: string;
  timestamp: number;
  corePhrase: string;
  sentences: SentenceData[]; 
  userAudios: UserAudio[]; 
}

export interface WordDefinition {
  word: string;
  ipa: string;
  definition: string; 
}

export const DEFAULT_SENTENCE_TYPES = [
  "个人经历/喜好习惯",
  "相关人物 (与我相关)",
  "社会/客观观点 (原因+例子)"
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