import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { AccentType, PronunciationResult, WordDefinition } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const audioCache = new Map<string, ArrayBuffer>();
const definitionCache = new Map<string, WordDefinition>();

// Helper: Retry mechanism for 503/Overloaded errors
const retryApiCall = async <T>(
  apiCall: () => Promise<T>, 
  retries: number = 5, 
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      
      // Detailed Error Inspection
      const errorStr = error.toString();
      const errorJSON = JSON.stringify(error);
      const combinedError = (errorStr + errorJSON).toLowerCase();
      
      // Check for common transient error codes and messages
      // 503: Service Unavailable / Overloaded
      // 429: Too Many Requests
      const isTransient = 
        combinedError.includes('503') || 
        combinedError.includes('overloaded') || 
        combinedError.includes('unavailable') ||
        combinedError.includes('429') ||
        combinedError.includes('resource exhausted') ||
        combinedError.includes('internal server error');

      if (isTransient) {
        // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s + random jitter
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 500; 
        console.warn(`Gemini API Transient Error (${i + 1}/${retries}): ${error.message || 'Unknown'}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a non-transient error (e.g., 400 Bad Request), throw immediately
      throw error; 
    }
  }
  
  console.error("Gemini API Request failed after max retries.", lastError);
  throw lastError;
};

// --- Single Sentence Generation ---

export const generateSingleSentence = async (
  corePhrase: string,
  type: string,
  draft: string
): Promise<{ content: string; patterns: string[] }> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  const prompt = `
    Task: Create a high-quality English spoken sentence.
    
    Core Phrase: "${corePhrase}"
    Type: ${type}
    Context/Draft: "${draft}"
    
    Requirements:
    1. Natural, authentic English spoken style.
    2. Must include Core Phrase.
    3. Use common English sentence patterns/structures/idioms where possible.
    4. If Type is "Objective View", use "Reason + Example" structure.
    
    Output JSON Schema:
    {
      "content": "The full English sentence.",
      "patterns": ["List of common sentence patterns or idioms used in the sentence (excluding the core phrase)"]
    }
  `;

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["content", "patterns"]
        }
      }
    }));

    return JSON.parse(response.text || '{"content": "", "patterns": []}');
  } catch (e) {
    console.error("generateSingleSentence failed", e);
    // Return empty result rather than throwing to prevent app crash
    return { content: "", patterns: [] };
  }
};

// --- Story Generation ---

export const generateStory = async (
  items: { corePhrase: string; sentences: string[] }[]
): Promise<{ title: string; content: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  const phrases = items.map(i => i.corePhrase).join(", ");
  const contextData = items.map(i => `Phrase: ${i.corePhrase}\nContext Sentences: ${i.sentences.join(" ")}`).join("\n---\n");

  const prompt = `
    Task: Write a short, engaging English story (approx 150-200 words) that naturally incorporates the specific core phrases provided below.
    
    Core Phrases to Include: ${phrases}
    
    Source Material (Use these context sentences as inspiration for the plot/characters):
    ${contextData}
    
    Requirements:
    1. The story must be coherent and flow naturally.
    2. You MUST use the Core Phrases provided. Highlight them in the text if possible (but output plain text).
    3. You can add connecting sentences and creative details to make it a good story.
    4. Provide a creative title.
    
    Output JSON Schema:
    {
      "title": "Story Title",
      "content": "Full story content..."
    }
  `;

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    }));

    return JSON.parse(response.text || '{"title": "Error", "content": "Failed to generate story."}');
  } catch (e) {
    console.error("generateStory failed", e);
    return { title: "Error", content: "AI 服务暂时繁忙，请稍后重试生成故事。" };
  }
};

export const getSynonyms = async (
  sentence: string,
  word: string
): Promise<string[]> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  const prompt = `
    Sentence: "${sentence}"
    Target: "${word}"
    Give exactly 3 synonyms/replacements that fit this context perfectly.
    Output: JSON Array of strings.
  `;

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    }));

    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("getSynonyms failed", e);
    return [];
  }
};

export const getWordDefinition = async (word: string): Promise<WordDefinition> => {
    if (definitionCache.has(word.toLowerCase())) {
        return definitionCache.get(word.toLowerCase())!;
    }
    
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();

    const prompt = `
      Target Word: "${word}"
      Provide:
      1. IPA (International Phonetic Alphabet)
      2. Very short Chinese definition (max 5 words)
      Output JSON.
    `;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        ipa: { type: Type.STRING },
                        definition: { type: Type.STRING }
                    },
                    required: ["ipa", "definition"]
                }
            }
        }));

        const result = JSON.parse(response.text || "{}");
        const def = { ...result, word };
        definitionCache.set(word.toLowerCase(), def);
        return def;
    } catch(e) {
        console.error("getWordDefinition failed", e);
        return { word, ipa: "", definition: "查询失败" };
    }
}

// --- TTS Generation & Preloading ---

export const generateSpeech = async (
  text: string,
  voiceName: string
): Promise<ArrayBuffer> => {
  const cleanText = text.trim();
  if (!cleanText) throw new Error("Empty text");
  
  // Check Cache First
  const cacheKey = `${voiceName}:${cleanText}`;
  if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
  }

  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }], 
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        console.error("Gemini TTS Error: No inlineData found in response", response);
        throw new Error("API returned no audio data.");
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const buffer = bytes.buffer;
    // Save to Cache
    audioCache.set(cacheKey, buffer);
    
    return buffer;
  } catch (e) {
    console.error("generateSpeech failed:", e);
    throw e;
  }
};

// Parallel fetch helper
export const preloadAudioSentences = async (sentences: string[], voiceName: string): Promise<ArrayBuffer[]> => {
    // Process sequentially if we want to be nice to the rate limiter, but parallel is better for UX.
    // Given the 503 issues, we might want to stagger them slightly or just rely on retryApiCall.
    // Let's rely on retryApiCall's backoff.
    const promises = sentences.map(s => generateSpeech(s, voiceName));
    return Promise.all(promises);
};

export const pcmToAudioBuffer = (buffer: ArrayBuffer, ctx: AudioContext): AudioBuffer => {
    const pcmData = new Int16Array(buffer);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
    }
    return audioBuffer;
};

// --- Pronunciation Scoring ---

export const evaluatePronunciation = async (
  audioBlob: Blob,
  targetText: string,
  accent: AccentType
): Promise<PronunciationResult> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(audioBlob);
  });
  const base64Audio = await base64Promise;

  const prompt = `
    Task: Evaluate English pronunciation.
    Target: "${targetText}"
    Accent: ${accent === AccentType.UK ? "British" : "American"}
    
    STRICT JSON Output Rules:
    1. "score": Integer 0-100.
    2. "feedback": string in Chinese. Very direct. Point out specific issues (intonation, rhythm, missing sounds). No greetings, no fluff. Max 30 words.
    3. "mistakes": array of strings. List ONLY the specific words that were mispronounced.
  `;

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "feedback", "mistakes"]
        },
      },
    }));

     return JSON.parse(response.text || "{}") as PronunciationResult;
  } catch (e) {
      console.error("evaluatePronunciation failed", e);
      return { score: 0, feedback: "评分服务繁忙 (503)，请稍后重试", mistakes: [] };
  }
};