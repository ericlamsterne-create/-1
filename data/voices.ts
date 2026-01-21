
import { VoiceOption } from '../types';

// Voice Configuration Format: "ModelName|Accent|Style"
// Model Genders & Characteristics (Gemini):
// - Charon: Male (Deep)
// - Fenrir: Male (Narrative/Strong)
// - Puck:   Male (Lively/Tenor)
// - Kore:   Female (Deep/Warm)
// - Zephyr: Female (Lively/Clear)

export const VOICES_US_PRESET: VoiceOption[] = [
  // --- Deep (深沉) ---
  { 
    id: 'us_deep_male', 
    label: '深沉 (Charon)', 
    geminiVoiceName: 'Charon|US|Deep', 
    gender: 'male',
    voiceSettings: { style: 'Deep' }
  },
  { 
    id: 'us_deep_female', 
    label: '深沉 (Kore)', 
    geminiVoiceName: 'Kore|US|Deep', 
    gender: 'female',
    voiceSettings: { style: 'Deep' }
  },

  // --- Narrative (叙述) ---
  { 
    id: 'us_narr_male', 
    label: '叙述 (Fenrir)', 
    geminiVoiceName: 'Fenrir|US|Narrative', 
    gender: 'male',
    voiceSettings: { style: 'Narrative' }
  },
  { 
    id: 'us_narr_female', 
    label: '叙述 (Zephyr)', 
    geminiVoiceName: 'Zephyr|US|Narrative', 
    gender: 'female',
    voiceSettings: { style: 'Narrative' }
  },

  // --- Lively (活泼) ---
  { 
    id: 'us_live_male', 
    label: '活泼 (Puck)', 
    geminiVoiceName: 'Puck|US|Lively', 
    gender: 'male',
    voiceSettings: { style: 'Lively' }
  },
  { 
    id: 'us_live_female', 
    label: '活泼 (Zephyr)', 
    geminiVoiceName: 'Zephyr|US|Lively', 
    gender: 'female',
    voiceSettings: { style: 'Lively' }
  },
];

export const VOICES_UK_PRESET: VoiceOption[] = [
  // --- Deep (深沉) ---
  { 
    id: 'uk_deep_male', 
    label: '深沉 (Charon)', 
    geminiVoiceName: 'Charon|UK|Deep', 
    gender: 'male',
    voiceSettings: { style: 'Deep' }
  },
  { 
    id: 'uk_deep_female', 
    label: '深沉 (Kore)', 
    geminiVoiceName: 'Kore|UK|Deep', 
    gender: 'female',
    voiceSettings: { style: 'Deep' }
  },

  // --- Narrative (叙述) ---
  { 
    id: 'uk_narr_male', 
    label: '叙述 (Fenrir)', 
    geminiVoiceName: 'Fenrir|UK|Narrative', 
    gender: 'male',
    voiceSettings: { style: 'Narrative' }
  },
  { 
    id: 'uk_narr_female', 
    label: '叙述 (Zephyr)', 
    geminiVoiceName: 'Zephyr|UK|Narrative', 
    gender: 'female',
    voiceSettings: { style: 'Narrative' }
  },

  // --- Lively (活泼) ---
  { 
    id: 'uk_live_male', 
    label: '活泼 (Puck)', 
    geminiVoiceName: 'Puck|UK|Lively', 
    gender: 'male',
    voiceSettings: { style: 'Lively' }
  },
  { 
    id: 'uk_live_female', 
    label: '活泼 (Zephyr)', 
    geminiVoiceName: 'Zephyr|UK|Lively', 
    gender: 'female',
    voiceSettings: { style: 'Lively' }
  },
];
