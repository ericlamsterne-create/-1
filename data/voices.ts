
import { VoiceOption } from '../types';

export const VOICES_US_PRESET: VoiceOption[] = [
  { id: 'us_duo', label: '多儿 (Zephyr)', geminiVoiceName: 'Zephyr' },
  { id: 'us_zari', label: 'Zari (Puck)', geminiVoiceName: 'Puck' },
  { id: 'us_lily', label: 'Lily (Fenrir)', geminiVoiceName: 'Fenrir' },
  { id: 'us_oscar', label: 'Oscar (Kore)', geminiVoiceName: 'Kore' },
  { id: 'us_bear', label: 'Falstaff (Charon)', geminiVoiceName: 'Charon' },
];

export const VOICES_UK_PRESET: VoiceOption[] = [
  { id: 'uk_std', label: '英式标准 (Zephyr)', geminiVoiceName: 'Zephyr' },
  { id: 'uk_posh', label: '英式贵族 (Kore)', geminiVoiceName: 'Kore' },
  { id: 'uk_deep', label: '英式深沉 (Charon)', geminiVoiceName: 'Charon' },
  { id: 'uk_narr', label: '英式叙述 (Fenrir)', geminiVoiceName: 'Fenrir' }, 
  { id: 'uk_fast', label: '英式活泼 (Puck)', geminiVoiceName: 'Puck' }, 
];
