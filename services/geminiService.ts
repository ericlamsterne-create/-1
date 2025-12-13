
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { AccentType, PronunciationResult, WordDefinition, UserProfile, P2Result } from "../types";
import { IELTS_Part1_Topics, IELTS_Part2_Topics, IELTS_Part3_Topics, IELTS_Writing_Task2_Topics } from "../data/ieltsData";
import { SENTENCE_FORMULAS, LogicFormula } from "../data/sentenceFormulas";
import { PHRASE_BANK } from "../data/phraseBank";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
const DAILY_API_LIMIT = 20;

const audioCache = new Map<string, ArrayBuffer>();
const definitionCache = new Map<string, WordDefinition>();

// Helper to check and increment daily usage
const checkUsageLimit = (userProfile?: UserProfile) => {
   if (userProfile?.invitationCode?.toLowerCase() === 'linguaflow666888') return; // Unlimited for VIP

   const today = new Date().toDateString();
   const storageKey = 'lingua_daily_api_usage';
   const data = JSON.parse(localStorage.getItem(storageKey) || '{}');

   // Reset if new day
   if (data.date !== today) {
       data.date = today;
       data.count = 0;
   }

   if (data.count >= DAILY_API_LIMIT) {
       throw new Error(`今日免费 AI 生成次数已耗尽 (${DAILY_API_LIMIT}次/天)。\n请在设置中输入邀请码解锁无限使用，或明日再试。`);
   }

   // Increment
   data.count = (data.count || 0) + 1;
   localStorage.setItem(storageKey, JSON.stringify(data));
};

const retryApiCall = async <T>(
  apiCall: () => Promise<T>, 
  retries: number = 3, 
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorStr = error.toString().toLowerCase();
      
      // CRITICAL FIX: Check for Quota Exceeded specifically
      if (errorStr.includes("limit: 0") || errorStr.includes("resource_exhausted") || errorStr.includes("quota")) {
          console.error("Gemini API Quota Exceeded:", error);
          throw new Error("API 免费额度已耗尽 (Quota Exceeded)。请前往 Google Cloud 绑定计费以升级额度，或明日再试。");
      }

      const isTransient = errorStr.match(/503|overloaded|unavailable|internal/);
      
      if (isTransient) {
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 1000; 
        console.warn(`API Busy (Attempt ${i+1}/${retries}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; 
    }
  }
  console.error("Gemini API failed after retries.", lastError);
  throw lastError;
};

// --- Formula Logic Helpers ---

const FORMULA_CATEGORIES = {
    // Type 1: Personal / Habits
    PERSONAL: ['formula_2_keen', 'formula_2_depends', 'formula_6', 'formula_7', 'formula_8', 'formula_10_plan'],
    // Type 2: People
    PEOPLE: ['formula_5_observation', 'formula_5_general', 'formula_3'],
    // Type 3: Social / Objective
    SOCIAL: ['formula_1', 'formula_4', 'formula_11', 'formula_12', 'formula_13', 'formula_14', 'formula_10_hypothetical']
};

const getTargetFormula = (type: string, excludeIds: string[]): LogicFormula | null => {
    let pool: string[] = [];
    
    if (type.includes("Personal") || type.includes("Habits") || type.includes("Part 1")) {
        pool = FORMULA_CATEGORIES.PERSONAL;
    } else if (type.includes("People")) {
        pool = FORMULA_CATEGORIES.PEOPLE;
    } else {
        pool = FORMULA_CATEGORIES.SOCIAL;
    }

    const available = pool.filter(id => !excludeIds.includes(id));
    const finalPool = available.length > 0 ? available : pool;
    
    if (finalPool.length === 0) return null;

    const randomId = finalPool[Math.floor(Math.random() * finalPool.length)];
    return SENTENCE_FORMULAS.find(f => f.id === randomId) || null;
};

// --- Single Sentence Generation ---

export const generateSingleSentence = async (
  corePhrase: string,
  type: string,
  draft: string,
  userProfile?: UserProfile,
  excludeFormulaIds: string[] = []
): Promise<{ content: string; patterns: string[], ieltsTopic?: string, logic?: string, formulaId?: string, questionSource?: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  
  // Check Usage Limit
  checkUsageLimit(userProfile);

  const ai = getAI();

  // 1. Check Phrase Bank for Example Context
  const bankEntry = PHRASE_BANK.find(p => 
      p.phrases.some(ph => corePhrase.toLowerCase().includes(ph.toLowerCase()))
  );
  const phraseContext = bankEntry 
      ? `\n[GOLD STANDARD REFERENCE]\nThe user is practicing the phrase "${corePhrase}". \nSTRICTLY MIMIC the style, length, and specificity of this example from our courseware:\n"${bankEntry.en}"\n(Do not copy it, but use it as a template for how specific and direct the answer should be.)` 
      : "";

  // 2. Inspiration Particles as Secondary Core Phrases
  const inspirationContext = userProfile?.inspiration 
      ? `\n[SECONDARY CORE PHRASES from Inspiration Pad]\nUser's notes: "${userProfile.inspiration}".\nInstruction: Scan these notes for any English phrases. If they fit the topic naturally, try to COMBINE them with the mandatory phrase "${corePhrase}". Treat them as bonus core phrases.`
      : "";

  let selectedTopic = "";
  let topicSource = "";
  let targetScore = "6.5";
  
  const isType1 = type.includes("Personal") || type.includes("Speaking Part 1");
  const isType2 = type.includes("People") || type.includes("Speaking Part 1 & 3");
  const isType3 = type.includes("Social") || type.includes("Writing");

  if (isType3) {
      targetScore = userProfile?.targetScoreWriting || "6.5";
      if (Math.random() > 0.5) {
          selectedTopic = IELTS_Writing_Task2_Topics[Math.floor(Math.random() * IELTS_Writing_Task2_Topics.length)];
          topicSource = "Writing Task 2";
      } else {
          selectedTopic = IELTS_Part3_Topics[Math.floor(Math.random() * IELTS_Part3_Topics.length)];
          topicSource = "Speaking Part 3";
      }
  } else if (isType2) {
      targetScore = userProfile?.targetScoreSpeaking || "6.5";
      if (Math.random() > 0.5) {
          selectedTopic = IELTS_Part1_Topics[Math.floor(Math.random() * IELTS_Part1_Topics.length)];
          topicSource = "Speaking Part 1";
      } else {
          selectedTopic = IELTS_Part3_Topics[Math.floor(Math.random() * IELTS_Part3_Topics.length)];
          topicSource = "Speaking Part 3";
      }
  } else {
      targetScore = userProfile?.targetScoreSpeaking || "6.5";
      selectedTopic = IELTS_Part1_Topics[Math.floor(Math.random() * IELTS_Part1_Topics.length)];
      topicSource = "Speaking Part 1";
  }

  let formulaInstruction = "";
  let selectedFormula: LogicFormula | null = null;
  const useGoldenFormulas = userProfile?.useGoldenFormulas !== false; 

  if (useGoldenFormulas) {
      selectedFormula = getTargetFormula(type, excludeFormulaIds);
      if (selectedFormula) {
          formulaInstruction = `
          MANDATORY FORMULA (${selectedFormula.description}):
          You MUST start or structure the sentence using these exact skeleton phrases: "${selectedFormula.skeleton.join(" ... ")}".
          Do not deviate from this structure. Fill in the blanks with content relevant to the Topic and Core Phrase.
          `;
      }
  } else {
      const allFormulas = SENTENCE_FORMULAS.map(f => `ID:${f.id}: ${f.skeleton.join("...")}`).join("\n");
      formulaInstruction = `Optional Logic Formulas (Use one if fits):\n${allFormulas}`;
  }

  const prompt = `
    Role: IELTS Speaking Coach.
    Task: Generate a natural, high-scoring answer using the phrase: "${corePhrase}".
    Question Context: "${selectedTopic}" (${topicSource}).

    ${phraseContext}
    ${inspirationContext}

    [CRITICAL PRIORITY HIERARCHY]
    1. **USER DRAFT (Highest)**: "${draft}". If provided, Polish this exact idea. Do NOT change the meaning.
    2. **USER PROFILE**: Role-${userProfile?.role}, Interests-${userProfile?.interests}. Use these to make it specific.
    3. **STYLE GUIDE (Strict)**:
       - **LENGTH**: Keep it SHORT and PUNCHY. Max 2-3 sentences (30-40 words). NOT a paragraph.
       - **CONTENT**: Direct Answer + 1 Specific Concrete Detail + Personal Feeling.
       - **SPECIFICITY**: Do not be vague. 
         - Bad: "I like reading books."
         - Good: "I enjoy reading sci-fi novels, especially 'The Three-Body Problem', because they expand my imagination."
         - Bad: "I go to the park."
         - Good: "I often go to Chaoyang Park to jog and clear my mind."

    ${formulaInstruction}

    Output JSON:
    {
      "content": "English answer. concise and specific.",
      "patterns": ["Formula skeleton phrases used."],
      "ieltsTopic": "${selectedTopic}",
      "logic": "Visual memory hook (Chinese). Use Emojis and Arrows. Example: '❌ 否认 -> 💡 游泳例子 -> ✅ 结论'. Max 15 words."
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
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            ieltsTopic: { type: Type.STRING },
            logic: { type: Type.STRING }
          },
          required: ["content", "patterns", "ieltsTopic", "logic"]
        }
      }
    }));

    const result = JSON.parse(response.text || '{"content": "", "patterns": [], "ieltsTopic": "", "logic": ""}');
    
    if (result.content) {
        setTimeout(() => generateSpeech(result.content, 'Zephyr').catch(() => {}), 100);
    }

    return {
        ...result,
        formulaId: selectedFormula?.id,
        questionSource: topicSource
    };
  } catch (e: any) {
    console.error("generateSingleSentence failed", e);
    // Propagate quota errors
    if (e.message && (e.message.includes("免费额度") || e.message.includes("次数已耗尽"))) throw e;
    return { content: "", patterns: [] };
  }
};

// --- Optimize / Polish User Manual Sentence ---

export const optimizeUserSentence = async (
    userText: string,
    corePhrase: string,
    type: string,
    userProfile?: UserProfile
): Promise<{ content: string; patterns: string[], ieltsTopic?: string, logic?: string, questionSource?: string }> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    // Check Usage Limit
    checkUsageLimit(userProfile);

    const ai = getAI();

    // 1. Check Phrase Bank for Example Context
    const bankEntry = PHRASE_BANK.find(p => 
        p.phrases.some(ph => corePhrase.toLowerCase().includes(ph.toLowerCase()))
    );
    const phraseContext = bankEntry 
        ? `\n[GOLD STANDARD REFERENCE]\nThe user is practicing the phrase "${corePhrase}". \nSTRICTLY MIMIC the style, length, and specificity of this example from our courseware:\n"${bankEntry.en}"` 
        : "";

    // Determine broad category to guess topic source
    let topicSource = "Speaking Part 1";
    if (type.includes("Writing") || type.includes("Part 3")) {
        topicSource = type.includes("Writing") ? "Writing Task 2" : "Speaking Part 3";
    }

    const prompt = `
      Role: IELTS Examiner / Editor.
      User's Draft Sentence: "${userText}"
      Core Phrase Context: "${corePhrase}"
      User Profile: Role-${userProfile?.role}, Interests-${userProfile?.interests}
      
      ${phraseContext}

      Task:
      1. Polish the user's sentence to sound more native (Band 7+).
      2. **Strictly preserve** the user's original meaning. Do not change their story.
      3. If the user's input is too short/vague (e.g., "I like it"), ONLY then add a small specific detail relevant to their profile (e.g., "I like it because it helps me unwind after coding").
      4. Keep the output CONCISE (2-3 sentences max).

      Output JSON:
      {
        "content": "Polished English sentence.",
        "patterns": ["Any useful collocations or phrases used"],
        "ieltsTopic": "The relevant IELTS topic question",
        "logic": "Visual memory hook (Chinese). Use Emojis."
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
                        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        ieltsTopic: { type: Type.STRING },
                        logic: { type: Type.STRING }
                    },
                    required: ["content", "patterns", "ieltsTopic", "logic"]
                }
            }
        }));

        const result = JSON.parse(response.text || '{}');
        if (result.content) {
             setTimeout(() => generateSpeech(result.content, 'Zephyr').catch(() => {}), 100);
        }
        return { ...result, questionSource: topicSource };

    } catch (e: any) {
        console.error("optimizeUserSentence failed", e);
        // Propagate quota errors
        if (e.message && (e.message.includes("免费额度") || e.message.includes("次数已耗尽"))) throw e;
        return { content: userText, patterns: [] }; // Fallback to original
    }
};

// --- Part 2 Long Turn Generation (Enhanced) ---

export const generateStory = async (
  items: { corePhrase: string; sentences: string[] }[],
  userProfile?: UserProfile
): Promise<P2Result> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  
  // Check Usage Limit
  checkUsageLimit(userProfile);

  const ai = getAI();

  const phrases = items.map(i => i.corePhrase).join(", ");
  const contentContext = items.map(i => i.sentences.join(" ")).join(" "); 
  const selectedP2Topic = IELTS_Part2_Topics[Math.floor(Math.random() * IELTS_Part2_Topics.length)];

  let profileContext = "";
  if (userProfile) {
      profileContext = `Speaker Context: Role-${userProfile.role}, Interests-${userProfile.interests}. Weave these into the story if they fit naturally.`;
  }

  const prompt = `
    Task: IELTS Speaking Part 2 Answer. Topic: "${selectedP2Topic}"
    Target Band: 8.0+. 
    Constraint: STRICTLY 8-10 sentences total.
    Constraint: Use natural, authentic English vocabulary. Avoid big, obscure words. Use specific details (e.g. name of a place, specific time) to make the story come alive.
    
    Inputs to use:
    1. Core Phrases (Must use): [${phrases}]
    2. Context Ideas (Inspiration from user history): "${contentContext}" (Don't copy verbatim, but use the ideas/themes to build a cohesive story).
    ${profileContext}
    
    MANDATORY STRUCTURE & MARKUP:
    You MUST wrap structural/linking phrases, transitional words, and idiom openings in {{double curly braces}} so the app can highlight them in Blue.
    Examples of what to mark: 
    - "{{When it comes to}}..."
    - "{{Speaking of}}..."
    - "{{As a matter of fact}}..."
    - "{{All in all}}..."
    - "{{Needless to say}}..."
    
    Structure:
    1. Introduction: Briefly define/describe What/Who/When/Where. 
    2. Transition 1: Move to details. 
    3. Transition 2 / Climax: The main point. 
    4. Conclusion: Final feelings. 
    
    Logic Output: A visual memory guide summary in Chinese using Emojis.

    Output JSON:
    {
      "title": "${selectedP2Topic}",
      "content": "Full spoken answer text with {{structure markers}}.",
      "logic": "The visual emoji logic summary string."
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
              content: { type: Type.STRING },
              logic: { type: Type.STRING }
          },
          required: ["title", "content", "logic"]
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{"title": "Error", "content": "Failed.", "logic": ""}');
    
    if (result.content) {
        const cleanText = result.content.replace(/\{\{|}}/g, "");
        setTimeout(() => generateSpeech(cleanText, 'Zephyr').catch(() => {}), 500);
    }

    return result;
  } catch (e: any) { 
      // Propagate quota errors
      if (e.message && (e.message.includes("免费额度") || e.message.includes("次数已耗尽"))) throw e;
      return { title: "Error", content: "AI Busy.", logic: "" }; 
  }
};

export const refineInspiration = async (rawText: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    if (!rawText.trim()) return "";
    const ai = getAI();
    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user has provided some raw text for their 'Inspiration Pad' (learning notes). 
            Task: Clean up and organize this text. Remove irrelevant noise/formatting. 
            Keep valuable English phrases, sentences, or Chinese context ideas. 
            Output the refined text directly. Keep it concise.
            Raw Text: "${rawText.slice(0, 2000)}"`, // Limit input size
        }));
        return response.text || rawText;
    } catch (e) {
        return rawText; // Fallback to original
    }
};

export const analyzeFeedback = async (feedbackText: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();
    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user provided this feedback about the AI app: "${feedbackText}".
            Task: Act as a Prompt Engineer. Suggest a specific 1-sentence modification or addition to the system prompt that would address this user's concern or suggestion.
            Keep it technical and actionable.`,
        }));
        return response.text || "Feedback recorded.";
    } catch (e) {
        return "Feedback recorded.";
    }
};

export const getSynonyms = async (sentence: string, word: string): Promise<string[]> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();
  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Sentence: "${sentence}". Target: "${word}". Provide 3 concise synonyms/replacements (Chinese translation in brackets). JSON Array only.`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
    }));
    return JSON.parse(response.text || "[]");
  } catch (e: any) { 
      return []; 
  }
};

export const getWordDefinition = async (word: string): Promise<WordDefinition> => {
    if (definitionCache.has(word.toLowerCase())) return definitionCache.get(word.toLowerCase())!;
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();
    try {
        // Optimized prompt for speed, strictly Chinese
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Define "${word}" in Simplified Chinese. 
            Constraint: The definition must be STRICTLY in Chinese. Do not return English definitions.
            Output JSON: {word: "${word}", definition: "Concise Chinese definition only"}`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { type: Type.OBJECT, properties: { word: {type:Type.STRING}, definition: {type:Type.STRING} } } 
            }
        }));
        const result = JSON.parse(response.text || "{}");
        const def = { ...result, word, ipa: "" }; 
        definitionCache.set(word.toLowerCase(), def);
        return def;
    } catch(e: any) { 
        return { word, ipa: "", definition: "查询失败" }; 
    }
}

export const generateSpeech = async (text: string, voiceName: string): Promise<ArrayBuffer> => {
  const cleanText = text.replace(/\{\{|}}/g, '').replace(/[*_~`]/g, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  if (!cleanText) return new ArrayBuffer(0);
  
  const VALID_VOICES = ['Zephyr', 'Puck', 'Fenrir', 'Kore', 'Charon'];
  const safeVoiceName = VALID_VOICES.includes(voiceName) ? voiceName : 'Zephyr';
  const cacheKey = `${safeVoiceName}:${cleanText}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }], 
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoiceName } } } },
    }));
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data");
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    audioCache.set(cacheKey, bytes.buffer);
    return bytes.buffer;
  } catch (e: any) { 
      console.error("TTS failed:", e); 
      if (e.message && e.message.includes("免费额度")) throw e;
      throw e; 
  }
};

export const preloadAudioSentences = async (sentences: string[], voiceName: string): Promise<ArrayBuffer[]> => {
    return Promise.all(sentences.filter(s => s?.trim()).map(s => generateSpeech(s, voiceName)));
};

export const pcmToAudioBuffer = (buffer: ArrayBuffer, ctx: AudioContext): AudioBuffer => {
    if (buffer.byteLength === 0) return ctx.createBuffer(1, 1, 24000);
    const pcmData = new Int16Array(buffer);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) channelData[i] = pcmData[i] / 32768.0;
    return audioBuffer;
};

// Helper to create WAV Blob from PCM for pitch-preserving HTML5 Audio playback
export const createWavBlob = (buffer: ArrayBuffer, sampleRate: number = 24000): Blob => {
    const numChannels = 1;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.byteLength, true);

    return new Blob([header, buffer], { type: 'audio/wav' });
};

export const evaluatePronunciation = async (audioBlob: Blob, targetText: string, accent: AccentType): Promise<PronunciationResult> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });
  const base64Audio = await base64Promise;

  const cleanTarget = targetText.replace(/\{\{|}}/g, "");

  try {
    const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } }, { text: `Eval pronun. Target: "${cleanTarget}". Accent: ${accent}. Output JSON {score, feedback (chinese, direct), mistakes[]}` }] },
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING }, mistakes: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
    }));
    return JSON.parse(response.text || "{}");
  } catch (e: any) { 
      if (e.message && e.message.includes("免费额度")) throw e;
      return { score: 0, feedback: "Error", mistakes: [] }; 
  }
};
