
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { AccentType, PronunciationResult, UserProfile, P2Result, ExamMessage, ExamReport, ListeningEntry, LogicFormula, SentenceData } from "../types";
import { IELTS_Part1_Topics, IELTS_Part2_Topics, IELTS_Part3_Topics, IELTS_Writing_Task2_Topics } from "../data/ieltsData";
import { SENTENCE_FORMULAS } from "../data/sentenceFormulas";
import { PHRASE_BANK } from "../data/phraseBank";
import { SCENE_VOCABULARY } from "../data/sceneVocabulary";
import { TOPIC_VOCABULARY } from "../data/topicVocabulary";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Updated Limits: 
// Flash Free Tier is ~1500 RPD. Paid is much higher.
// Setting a high soft limit to avoid nagging users unless they are really spamming.
const DAILY_API_LIMIT = 2000; 

// --- MODEL CONFIGURATION ---
// FIXED: Use standard preview models to ensure availability
const MODEL_TEXT = 'gemini-3-flash-preview';             // Updated from 2.5-flash (which might be invalid)
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';      // Dedicated for Speech
const MODEL_EVAL = 'gemini-3-flash-preview';             // Updated for evaluation

// --- CACHE SYSTEMS ---

// 1. Audio Cache (Binary AudioBuffers)
const audioCache = new Map<string, ArrayBuffer>();
const cacheIndex = new Set<string>();

// 2. Listening Analysis Cache (JSON Logic)
// Stores parsed listening analysis results to avoid re-processing long transcripts.
const listeningCache = new Map<string, ListeningEntry>();

// L2 Persistent Cache (IndexedDB)
const DB_NAME = 'LinguaFlow_Audio_Cache';
const AUDIO_STORE = 'tts_chunks';
const TEXT_STORE = 'analysis_results'; // New store for text analysis

const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject('IndexedDB not supported');
            return;
        }
        const request = indexedDB.open(DB_NAME, 2); // Version bumped to 2 for new store
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE);
            }
            if (!db.objectStoreNames.contains(TEXT_STORE)) {
                db.createObjectStore(TEXT_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Simple string hash for cache keys
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
};

// Warm up the cache index on app start
export const warmupAudioCache = async () => {
    try {
        const db = await getDB();
        
        // Warmup Audio Index
        const tx = db.transaction(AUDIO_STORE, 'readonly');
        const store = tx.objectStore(AUDIO_STORE);
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
            const keys = request.result;
            keys.forEach((k) => cacheIndex.add(k.toString()));
            console.log(`[Cache] Warmed up with ${keys.length} existing audio clips.`);
        };

        // Warmup Listening Analysis Cache (Load into memory map for speed)
        const tx2 = db.transaction(TEXT_STORE, 'readonly');
        const store2 = tx2.objectStore(TEXT_STORE);
        const req2 = store2.openCursor();
        req2.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
                listeningCache.set(cursor.key.toString(), cursor.value);
                cursor.continue();
            }
        };

    } catch (e) {
        console.warn("Cache warmup failed", e);
    }
};

const getCachedAudio = async (key: string): Promise<ArrayBuffer | undefined> => {
    if (audioCache.has(key)) return audioCache.get(key);
    if (!cacheIndex.has(key)) return undefined;
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(AUDIO_STORE, 'readonly');
            const store = tx.objectStore(AUDIO_STORE);
            const req = store.get(key);
            req.onsuccess = () => {
                if (req.result) {
                    audioCache.set(key, req.result);
                    resolve(req.result);
                } else resolve(undefined);
            };
            req.onerror = () => resolve(undefined);
        });
    } catch (e) { return undefined; }
};

const setCachedAudio = async (key: string, data: ArrayBuffer) => {
    audioCache.set(key, data);
    cacheIndex.add(key);
    try {
        const db = await getDB();
        const tx = db.transaction(AUDIO_STORE, 'readwrite');
        const store = tx.objectStore(AUDIO_STORE);
        store.put(data, key);
    } catch (e) { console.warn("Cache write failed", e); }
};

const checkUsageLimit = (userProfile?: UserProfile) => {
   const today = new Date().toDateString();
   const storageKey = 'lingua_daily_api_usage';
   const data = JSON.parse(localStorage.getItem(storageKey) || '{}');

   if (data.date !== today) {
       data.date = today;
       data.count = 0;
   }
   
   // Warn only if usage is extremely high relative to typical daily use
   if (data.count >= DAILY_API_LIMIT) { 
       console.warn(`Daily limit warning: ${data.count} requests.`);
   }

   data.count = (data.count || 0) + 1;
   localStorage.setItem(storageKey, JSON.stringify(data));
};

const retryApiCall = async <T>(
  apiCall: () => Promise<T>, 
  retries: number = 3, // Retries for transient/rate-limit errors
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorStr = error.toString().toLowerCase();
      
      // Critical Client Errors - No Retry
      if (errorStr.includes("400") || errorStr.includes("invalid_argument")) {
          console.error("Gemini API Bad Request:", error);
          throw new Error("请求无效 (400 Bad Request)。可能输入过长或格式不支持。");
      }
      if (errorStr.includes("404") || errorStr.includes("not_found")) {
          console.error("Gemini Model Not Found:", error);
          throw new Error("AI 模型暂不可用 (404)。");
      }

      // Handle 429 (Rate Limit) & 5xx (Server Errors) as Retriable
      // Note: "resource_exhausted" usually maps to 429
      const isRateLimit = errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota");
      const isTransient = errorStr.match(/503|overloaded|unavailable|internal|timeout|fetch failed|network/);

      if (isRateLimit || isTransient) {
        // If it's the LAST retry attempt, throw the specific error
        if (i === retries - 1) {
            if (isRateLimit) {
                console.error("Gemini API Rate Limit hit after retries:", error);
                throw new Error("系统繁忙，请稍等几秒再试 (429 Too Many Requests)。");
            }
            throw error; // Throw the original transient error
        }

        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 500; 
        console.warn(`API Error (${isRateLimit ? 'Rate Limit' : 'Transient'}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Unknown Error - Throw immediately
      throw error; 
    }
  }
  throw lastError;
};

// ... [Mandatory Vocab Logic Preserved] ...
const getMandatoryVocabularyInstruction = (draftInput: string): { instruction: string, words: string[] } => {
    if (!draftInput) return { instruction: "", words: [] };
    const matched: string[] = [];
    const usedWords = new Set<string>();
    TOPIC_VOCABULARY.forEach(item => {
        if (draftInput.includes(item.cn)) {
            matched.push(`${item.cn} -> ${item.en}`);
            usedWords.add(item.en);
        }
    });
    if (matched.length === 0) return { instruction: "", words: [] };
    return {
        instruction: `[MANDATORY VOCABULARY OVERRIDE]\nThe user has specified concepts that MUST be translated using these exact IELTS terms:\n${matched.map(m => "- " + m).join("\n")}\nPRIORITIZE these words over generic translations.`,
        words: Array.from(usedWords)
    };
};

const getEffectiveFormulas = (userProfile?: UserProfile): LogicFormula[] => {
    const defaults = SENTENCE_FORMULAS;
    const customs = userProfile?.customFormulas || [];
    const formulaMap = new Map<string, LogicFormula>();
    defaults.forEach(f => formulaMap.set(f.id, f));
    customs.forEach(f => formulaMap.set(f.id, f));
    return Array.from(formulaMap.values());
};

const cleanSkeletonForAI = (text: string): string => {
    return (text || '').replace(/<[^>]+>/g, '').trim();
};

const getRelevantVocabulary = (topic: string): string[] => {
    const t = topic.toLowerCase();
    const vocab: string[] = [];
    if (t.includes('work') || t.includes('job') || t.includes('company')) vocab.push(...SCENE_VOCABULARY.job);
    if (t.includes('study') || t.includes('school') || t.includes('student') || t.includes('learn')) vocab.push(...SCENE_VOCABULARY.education);
    if (t.includes('live') || t.includes('home') || t.includes('house') || t.includes('city') || t.includes('building')) vocab.push(...SCENE_VOCABULARY.accommodation);
    if (vocab.length === 0) { vocab.push(...SCENE_VOCABULARY.accommodation); vocab.push(...SCENE_VOCABULARY.activity); }
    return vocab.sort(() => 0.5 - Math.random()).slice(0, 40);
};

// Helper: Get value with contextual note
const getPersonaVal = (p: UserProfile, key: keyof UserProfile, defaultVal: string): string => {
    const mainVal = (p[key] as string) || defaultVal;
    const note = p.persona_notes?.[key];
    if (note && note.trim()) {
        return `${mainVal} (Context Note: "${note.trim()}")`;
    }
    return mainVal;
};

// --- CORE GENERATION FUNCTIONS ---

export const generateSingleSentence = async (
    corePhrase: string, 
    type: string, 
    draft: string, 
    userProfile?: UserProfile, 
    excludeFormulaIds: string[] = [],
    forcedFormulaId?: string
): Promise<{ content: string; patterns: string[], ieltsTopic?: string, formulaId?: string, questionSource?: string, coreNouns?: string[], logic?: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  checkUsageLimit(userProfile);
  const ai = getAI();
  
  const isQuestionType = type.includes("?");
  const questionContext = isQuestionType ? type : `Topic: ${corePhrase}`;
  const relevantVocab = getRelevantVocabulary(questionContext);
  const vocabInstruction = `[VOCABULARY SUGGESTION]\nContext: ${questionContext}.\nAvailable Words: [${relevantVocab.join(", ")}]\nInstruction: You may use these if they fit, but prioritize natural flow.`;
  const { instruction: mandatoryVocabInstruction, words: matchedTopicWords } = getMandatoryVocabularyInstruction(draft);
  const targetScore = parseFloat(userProfile?.targetScoreSpeaking || userProfile?.targetScore || "6.5");
  const targetDetail = userProfile?.targetScoreDetail || "";
  const isLowScoreTarget = targetScore <= 6.0;
  
  let lengthConstraint = "";
  let bandLevelInstruction = "";

  if (isLowScoreTarget) {
      lengthConstraint = "LENGTH CONSTRAINT: Keep the answer SHORT and DIRECT (Maximum 2-3 short sentences). Focus on clarity.";
      bandLevelInstruction = "Optimize for Band 6.0: Prioritize clarity. Use common vocabulary but combine them into complete, logical sentences (compound/complex). Do not use obscure words, but ensure the sentence structure shows ability to connect ideas. Avoid overly complex idioms.";
  } else {
      lengthConstraint = "LENGTH CONSTRAINT: Provide a fully developed answer (3-5 sentences) with detailed examples/reasoning.";
      bandLevelInstruction = `Optimize for Band ${targetScore}+ (Idiomatic vocabulary, complex structures).`;
  }
  
  // New User Preference Injection
  if (targetDetail) {
      bandLevelInstruction += `\n[USER SPECIFIC PREFERENCE]: "${targetDetail}". STRICTLY ADHERE to this style guidance (e.g. if user asks for idioms, use idioms; if user asks for simple words, simplify).`;
  }

  // Specificity Instruction (Enhancement)
  const specificityInstruction = `
  [CRITICAL: SPECIFICITY RULE]
  - DO NOT be generic. Avoid vague phrases like "broaden my horizons", "release stress", or "it is good" without concrete context.
  - USE CONCRETE DETAILS: Mention specific names, items, places, or actions relevant to the user's persona or topic.
  - EXAMPLE (Bad): "I like music because it relaxes me."
  - EXAMPLE (Good): "I love listening to Jazz classics like Miles Davis in the evening; the smooth saxophone melodies really help me unwind after a hectic day of coding."
  `;
  
  let formulaInstruction = "";
  const isGloballyEnabled = userProfile?.useGoldenFormulas !== false;
  const isSpecificFormulaEnabled = forcedFormulaId ? !userProfile?.disabledFormulaIds?.includes(forcedFormulaId) : true;

  if (isGloballyEnabled && isSpecificFormulaEnabled) {
      const allFormulas = getEffectiveFormulas(userProfile);
      const formulaObj = allFormulas.find(f => f.id === forcedFormulaId);
      if (formulaObj) {
          const variationsText = formulaObj.variations.map((v, i) => `Option ${i+1} (${v.title || 'General'}): \n${v.skeleton.map(cleanSkeletonForAI).join('\n')}`).join('\n\n');
          formulaInstruction = `
          [MANDATORY LOGIC STRUCTURE]
          The user is practicing a specific type of question: "${formulaObj.category}".
          You MUST structure your answer using one of the following templates. 
          
          ${variationsText}
          
          CRITICAL REQUIREMENT: 
          1. You MUST use the fixed phrases from the selected template.
          2. **If a phrase contains slashes (e.g. "The main reason is that/for starters"), you MUST select ONLY ONE option appropriate for the context. Do NOT write "A/B".**
          3. Do not change the connector words in the skeleton.
          4. Fill in the [placeholders] with the User's Draft content: "${draft}".
          `;
      }
  } else {
      formulaInstruction = `[FORMULA DISABLED] Generate a natural, high-scoring answer based on the user draft. Do NOT force a specific skeleton structure. Focus on fluency, coherence, and highlighting core nouns.`;
  }

  let personalizationContext = "";
  if (userProfile) {
      const p = userProfile;
      personalizationContext = `
[STRICT USER PERSONA & INSPIRATION USAGE]
You must construct the answer AS THE USER, adopting their persona/views.
1. CORE IDENTITY: Social: ${getPersonaVal(p, 'social_style', 'Ambivert')}. Work/Study: ${getPersonaVal(p, 'identity_role', 'Student')}.
2. LIFESTYLE: ${getPersonaVal(p, 'life_daily_routine', 'Standard')}.
3. PREFERENCES: ${getPersonaVal(p, 'interest_art', 'Pop')}.
4. **IMPORTANT**: ${p.user_defined_persona ? `USER STRATEGIC FOCUS: "${p.user_defined_persona}".` : ""}
5. **FRAGMENT HANDLING**: The user's input draft and 'Inspiration Particles' may contain broken English or scattered keywords.
   - YOUR JOB IS TO INTELLIGENTLY ASSEMBLE THESE FRAGMENTS.
   - Fix any grammar/logic errors in their notes/draft implicitly.
   - Do NOT just copy the user's bad grammar. Polish it into natural English.
   - If the user's draft is empty, pull relevant ideas from their 'Inspiration Particles' or 'Persona Notes' that fit the current topic.
${p.inspiration ? `USER'S INSPIRATION PARTICLES: "${p.inspiration.slice(0, 500)}"` : ""}
`;
  }
  
  const prompt = `
  Role: IELTS Speaking Coach.
  Task: Generate a natural answer tailored to Target Band ${targetScore}.
  IELTS Question: "${questionContext}"
  ${vocabInstruction}
  ${mandatoryVocabInstruction}
  ${personalizationContext}
  ${formulaInstruction}
  ${specificityInstruction}
  ${bandLevelInstruction}
  
  [PRIORITY]
  1. ${isGloballyEnabled && isSpecificFormulaEnabled ? "**LOGIC SKELETON**: Follow the mandatory structure provided above." : "Flow: Ensure natural speaking flow."}
  2. **USER DRAFT & FRAGMENTS**: "${draft}". REWRITE their draft/fragments to fit the context. Correct any grammar mistakes.
  3. **PERSONA CONSISTENCY**: Use the persona profile to decide *what* to say.
  4. **LENGTH**: ${lengthConstraint}
  
  Output JSON: { "content": "Full answer", "patterns": ["Exact phrases from formula"], "ieltsTopic": "${questionContext}", "coreNouns": ["List 3-5 nouns"], "logic": "Logic description" }`;
  
  try { 
      const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, patterns: { type: Type.ARRAY, items: { type: Type.STRING } }, ieltsTopic: { type: Type.STRING }, coreNouns: { type: Type.ARRAY, items: { type: Type.STRING } }, logic: { type: Type.STRING } }, required: ["content", "patterns", "ieltsTopic"] } } })); 
      const result = JSON.parse(response.text || '{"content": "", "patterns": [], "ieltsTopic": "", "coreNouns": []}'); 
      
      if (result.content) { 
          generateSpeech(result.content, userProfile?.preferredVoiceId || 'us_live_male').catch(() => console.warn("Auto-audio failed")); 
      } 
      return { ...result, formulaId: isSpecificFormulaEnabled ? (forcedFormulaId || excludeFormulaIds[0]) : undefined, questionSource: "Generated" }; 
  } catch (e: any) { 
      console.error("generateSingleSentence failed", e); 
      throw e; 
  }
};

export const optimizeUserSentence = async (userText: string, corePhrase?: string, type?: string, userProfile?: UserProfile): Promise<{ content: string; patterns: string[], ieltsTopic?: string, logic?: string, questionSource?: string, coreNouns?: string[] }> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    // Only check usage if full user profile is passed (normal flow), otherwise bypass for settings tweaks
    if(userProfile) checkUsageLimit(userProfile);
    const ai = getAI();
    const prompt = `Role: English Editor.\nInput: "${userText}"\nTask: Fix grammar, improve clarity, and make it sound natural. Maintain the original meaning.\nOutput JSON:\n{ "content": "Corrected Version", "patterns": [], "ieltsTopic": "Optimized", "coreNouns": [] }`;
    try { 
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } })); 
        return { ...JSON.parse(response.text || '{}'), questionSource: "Optimized" }; 
    } catch (e) { throw e; }
};

// --- AUDIO GENERATION (TTS) ---

export const generateSpeech = async (text: string, voiceKey: string): Promise<ArrayBuffer> => {
  if (!text) return new ArrayBuffer(0);
  
  // Normalization for Cache Hit Rate
  const cleanText = text.replace(/\[.*?\]/g, '').replace(/<.*?>/g, '').replace(/\{\{|}}/g, '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleanText) return new ArrayBuffer(0);
  
  // Parse Voice Key (Format: Model|Accent|Style)
  // Example: "Charon|US|Deep" or legacy "us_deep_male"
  let model = 'Zephyr'; 
  let accent = 'US';
  let style = 'Standard';
  let gender = 'female';

  // Map legacy/preset IDs to Gemini configurations
  if (voiceKey.includes('deep_male')) { model = 'Charon'; gender = 'male'; style = 'Deep'; }
  else if (voiceKey.includes('deep_female')) { model = 'Kore'; gender = 'female'; style = 'Deep'; }
  else if (voiceKey.includes('narr_male')) { model = 'Fenrir'; gender = 'male'; style = 'Narrative'; }
  else if (voiceKey.includes('narr_female')) { model = 'Zephyr'; gender = 'female'; style = 'Narrative'; }
  else if (voiceKey.includes('live_male')) { model = 'Puck'; gender = 'male'; style = 'Lively'; }
  else if (voiceKey.includes('live_female')) { model = 'Zephyr'; gender = 'female'; style = 'Lively'; }
  else if (voiceKey.includes('|')) {
      const parts = voiceKey.split('|');
      model = parts[0];
      accent = parts[1] || 'US';
      style = parts[2] || 'Standard';
      // Infer gender from model name
      if (['Charon', 'Fenrir', 'Puck'].includes(model)) gender = 'male';
      else gender = 'female';
  }

  if (voiceKey.startsWith('uk_')) accent = 'UK';
  
  // Improved Cache Key: Clean text + Voice Params
  const cacheKey = `${model}:${accent}:${style}:${gender}:${simpleHash(cleanText)}`; 
  
  // 1. Check Caches
  const cached = await getCachedAudio(cacheKey);
  if (cached) {
      console.debug("Audio Cache Hit:", cacheKey);
      return cached;
  }

  // 2. Fetch from API
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = getAI();

  try { 
      const safeVoiceName = ['Zephyr', 'Puck', 'Fenrir', 'Kore', 'Charon'].includes(model) ? model : 'Zephyr';
      
      const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({ 
          model: MODEL_TTS, 
          contents: [{ parts: [{ text: cleanText }] }], 
          config: { 
              responseModalities: [Modality.AUDIO], 
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoiceName } } },
              // REMOVED systemInstruction to fix 500 Internal Errors
          } 
      })); 
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data; 
      if (!base64Audio) throw new Error("No audio data"); 
      const binaryString = atob(base64Audio); 
      const bytes = new Uint8Array(binaryString.length); 
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i); 
      
      const buffer = bytes.buffer;
      
      // 3. Write to Cache (Async)
      setCachedAudio(cacheKey, buffer);
      
      return buffer; 
  } catch (e: any) { 
      console.error("TTS failed:", e); 
      throw e;
  }
};

// --- LISTENING ANALYSIS (CACHED) ---

export const analyzeListeningInput = async (rawText: string, userProfile?: UserProfile): Promise<ListeningEntry> => {
    // 1. Check Memory Cache
    const hash = simpleHash(rawText.trim());
    if (listeningCache.has(hash)) {
        console.log("Listening Analysis Cache Hit (Memory)");
        return listeningCache.get(hash)!;
    }

    // 2. Check DB Cache
    try {
        const db = await getDB();
        const tx = db.transaction(TEXT_STORE, 'readonly');
        const store = tx.objectStore(TEXT_STORE);
        const req = store.get(hash);
        
        const cachedResult = await new Promise<ListeningEntry | undefined>((resolve) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        });

        if (cachedResult) {
            console.log("Listening Analysis Cache Hit (DB)");
            listeningCache.set(hash, cachedResult);
            return cachedResult;
        }
    } catch(e) {}

    // 3. API Call
    if (!process.env.API_KEY) throw new Error("API Key missing");
    checkUsageLimit(userProfile);
    const ai = getAI();
    
    const prompt = `
    Role: IELTS Listening Expert.
    Task: Analyze the provided listening transcript snippet.
    Input Text: "${rawText.slice(0, 3000)}"
    
    Requirements:
    1. Identify the Source Title (e.g. "Cambridge 14 Test 2 Part 3"). If unknown, generate a descriptive title.
    2. Identify the Question Type (e.g. "Gap Filling", "Multiple Choice", "Map", "Matching").
    3. Process the text:
       - Fix formatting errors.
       - Mark LOCATORS (signpost words) with [LOC]word[/LOC].
       - Mark ANSWERS (likely blank fills) with [ANS]word[/ANS].
       - Mark LOGIC KEYWORDS (but, however, so) with [KEY]word[/KEY].
       - Mark DIRECTIONS (north, left) with [DIR]word[/DIR] (only if Map type).
    4. Generate a 1-sentence summary.

    Output JSON:
    {
      "sourceTitle": "string",
      "questionType": "string",
      "analyzedContent": "string (with [TAG]...[/TAG])",
      "summary": "string"
    }
    `;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({ 
            model: MODEL_TEXT, 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        sourceTitle: { type: Type.STRING }, 
                        questionType: { type: Type.STRING }, 
                        analyzedContent: { type: Type.STRING }, 
                        summary: { type: Type.STRING } 
                    } 
                } 
            } 
        }));
        
        const result = JSON.parse(response.text || '{}');
        const entry: ListeningEntry = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            originalText: rawText,
            analyzedContent: result.analyzedContent || rawText,
            sourceTitle: result.sourceTitle || "Unknown Text",
            questionType: result.questionType || "Mixed",
            summary: result.summary
        };

        // 4. Save to Caches
        listeningCache.set(hash, entry);
        try {
            const db = await getDB();
            const tx = db.transaction(TEXT_STORE, 'readwrite');
            const store = tx.objectStore(TEXT_STORE);
            store.put(entry, hash);
        } catch(e) {}

        return entry;
    } catch (e: any) {
        console.error("Listening Analysis Failed", e);
        throw e;
    }
};

// ... [Exports for other functions like preloadAudioSentences, pcmToAudioBuffer, etc. remain the same] ...
export const preloadAudioSentences = async (sentences: string[], voiceName: string): Promise<ArrayBuffer[]> => { return Promise.all(sentences.filter(s => s?.trim()).map(s => generateSpeech(s, voiceName))); };
export const pcmToAudioBuffer = (buffer: ArrayBuffer, ctx: AudioContext): AudioBuffer => { if (buffer.byteLength === 0) return ctx.createBuffer(1, 1, 24000); const pcmData = new Int16Array(buffer); const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000); const channelData = audioBuffer.getChannelData(0); for (let i = 0; i < pcmData.length; i++) channelData[i] = pcmData[i] / 32768.0; return audioBuffer; };
export const createWavBlob = (buffer: ArrayBuffer, sampleRate: number = 24000): Blob => { const numChannels = 1; const header = new ArrayBuffer(44); const view = new DataView(header); const writeString = (view: DataView, offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); }; writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + buffer.byteLength, true); writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * 2, true); view.setUint16(32, numChannels * 2, true); view.setUint16(34, 16, true); writeString(view, 36, 'data'); view.setUint32(40, buffer.byteLength, true); return new Blob([header, buffer], { type: 'audio/wav' }); };
export const evaluatePronunciation = async (audioBlob: Blob, targetText: string, accent: AccentType): Promise<PronunciationResult> => { 
    if (!process.env.API_KEY) throw new Error("API Key missing"); 
    const ai = getAI(); 
    const reader = new FileReader(); 
    const base64Promise = new Promise<string>((resolve) => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(audioBlob); }); 
    const base64Audio = await base64Promise; 
    const cleanTarget = targetText.replace(/\{\{|}}/g, ""); 
    const mimeType = (audioBlob.type || 'audio/webm').split(';')[0]; // Clean MIME
    const prompt = `Role: Professional Speech Pathologist.\nEvaluate user pronunciation of: "${cleanTarget}".\nAccent: ${accent}.\nOutput JSON:\n{ "score": (0-100), "accuracyScore": 0-100, "fluencyScore": 0-100, "integrityScore": 0-100, "feedback": "Chinese advice, max 2 sentences", "mistakes": ["words"] }`; 
    try { 
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({ model: MODEL_EVAL, contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Audio } }, { text: prompt }] }, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, accuracyScore: { type: Type.INTEGER }, fluencyScore: { type: Type.INTEGER }, integrityScore: { type: Type.INTEGER }, feedback: { type: Type.STRING }, mistakes: { type: Type.ARRAY, items: { type: Type.STRING } } } } } })); 
        return JSON.parse(response.text || "{}"); 
    } catch (e: any) { 
        if (e.message && e.message.includes("429")) return { score: 0, accuracyScore: 0, fluencyScore: 0, integrityScore: 0, feedback: "系统繁忙 (429)，请稍后再试。", mistakes: [] };
        if (e.message && e.message.includes("免费额度")) throw e; 
        return { score: 0, accuracyScore: 0, fluencyScore: 0, integrityScore: 0, feedback: "Error evaluating", mistakes: [] }; 
    } 
};

// --- NEW EXPORTED FUNCTIONS ---

export const generateP2StoryFromSentences = async (sentences: SentenceData[], userProfile?: UserProfile): Promise<P2Result> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    checkUsageLimit(userProfile);
    const ai = getAI();
    
    // Extract content from sentences
    const inputContent = sentences.map(s => s.content).filter(Boolean).join("\n");
    const topic = sentences[0]?.ieltsTopic || "Custom Topic"; // FIX: use ieltsTopic instead of topicLabel

    const prompt = `
    Role: IELTS Speaking Coach.
    Task: Create a cohesive IELTS Part 2 Story (1-2 minutes speech) based on the user's Part 1/3 answers.
    Topic: ${topic}
    User's Sentences:
    ${inputContent}

    Requirements:
    1. Connect these disconnected sentences into a smooth, natural story.
    2. Add connecting phrases and logical flow.
    3. Ensure it sounds like a natural spoken response (Band 7.0+).
    4. Keep the core meaning of user's sentences.

    Output JSON:
    {
      "title": "A short title for the story",
      "content": "The full story text",
      "logic": "Brief explanation of the structure used"
    }
    `;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_TEXT,
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
        
        const result = JSON.parse(response.text || '{}');
        
        const p2Sentence: SentenceData = {
            type: "Part 2",
            question: topic,
            questionPart: 'Part 2',
            content: result.content,
            draftInput: "",
            logic: result.logic
        };

        return {
            title: result.title,
            content: result.content,
            logic: result.logic,
            sentences: [p2Sentence]
        };

    } catch (e) {
        console.error("P2 Generation Failed", e);
        throw e;
    }
};

export const refineInspiration = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();
    const prompt = `Role: English Editor.
    Task: Polish the user's raw idea fragment into natural, high-level English.
    Input: "${text}"
    Output: Only the refined English text, no explanations.`;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
             model: MODEL_TEXT,
             contents: prompt
        }));
        return response.text?.trim() || text;
    } catch(e) {
        throw e;
    }
};

export const analyzeFeedback = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();
    const prompt = `Role: AI Assistant.
    Task: Analyze the user's feedback or request for the app settings.
    User Input: "${text}"
    Output: A short, helpful suggestion or confirmation (max 1 sentence).`;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
             model: MODEL_TEXT,
             contents: prompt
        }));
        return response.text?.trim() || "Thank you for your feedback.";
    } catch(e) {
        return "Received.";
    }
};

export const generateExamReport = async (transcript: ExamMessage[], snapshots: string[]): Promise<ExamReport> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();

    const textPart = {
        text: `Role: IELTS Examiner.
        Task: Evaluate the candidate's performance based on the transcript.
        
        Transcript:
        ${transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}
        
        Requirements:
        1. Give Band Scores (0-9) for Fluency, Vocabulary, Grammar, Pronunciation.
        2. Calculate Overall Score.
        3. Provide specific feedback for Part 1, 2, 3.
        4. Provide 3 sentence optimizations.

        Output JSON Schema:
        {
            overallScore: number,
            fluency: number,
            vocabulary: number,
            grammar: number,
            pronunciation: number,
            expressionFeedback: string,
            part1Feedback: string,
            part2Feedback: string,
            part3Feedback: string,
            optimizedSentences: [{ original: string, improved: string, reason: string }]
        }
        `
    };

    // Images if any
    const imageParts = snapshots.slice(0, 3).map(base64 => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64
        }
    }));

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_EVAL,
            contents: { parts: [...imageParts, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallScore: { type: Type.NUMBER },
                        fluency: { type: Type.NUMBER },
                        vocabulary: { type: Type.NUMBER },
                        grammar: { type: Type.NUMBER },
                        pronunciation: { type: Type.NUMBER },
                        expressionFeedback: { type: Type.STRING },
                        part1Feedback: { type: Type.STRING },
                        part2Feedback: { type: Type.STRING },
                        part3Feedback: { type: Type.STRING },
                        optimizedSentences: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    original: { type: Type.STRING },
                                    improved: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["overallScore", "fluency", "vocabulary", "grammar", "pronunciation", "expressionFeedback", "part1Feedback", "part2Feedback", "part3Feedback", "optimizedSentences"]
                }
            }
        }));

        return JSON.parse(response.text || '{}') as ExamReport;
    } catch (e) {
        console.error("Exam Report Failed", e);
        throw e;
    }
};

export const generateFormulaExample = async (skeleton: string[]): Promise<{ question: string; answer: string[] }> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = getAI();

    const skeletonStr = skeleton.join('\n');
    const prompt = `
    Role: IELTS Expert.
    Task: Generate a realistic Q&A example using the provided logic skeleton.
    
    Skeleton:
    ${skeletonStr}

    Requirements:
    1. Create a typical IELTS Part 1 Question.
    2. Write an Answer that strictly follows the skeleton structure.
    3. Retain the XML-like tags (<Y>, <B>, etc.) in the answer if present in skeleton.
    4. Fill in placeholders like [Reason A] with concrete content.

    Output JSON:
    {
        "question": "The question string",
        "answer": ["Line 1", "Line 2", ...]
    }
    `;

    try {
        const response = await retryApiCall<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }));
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Generate Formula Example Failed", e);
        throw e;
    }
};
