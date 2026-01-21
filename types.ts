
export interface SentenceData {
  type: string; 
  question: string; 
  questionPart: 'Part 1' | 'Part 2' | 'Part 3';
  content: string;
  draftInput: string;
  patterns?: string[]; 
  ieltsTopic?: string; 
  logic?: string; 
  formulaId?: string; 
  questionSource?: string; 
  sceneWords?: string[]; 
  coreNouns?: string[]; 
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
  topicLabel: string; 
  sentences: SentenceData[]; 
  userAudios: UserAudio[]; 
  isP2?: boolean; // Marker for P2 Sessions
}

export interface P2Session extends Session {
    topic: string; 
    logic: string;
    content: string;
    corePhrases?: string[];
}

export interface FormulaVariation {
    title?: string;
    skeleton: string[];
    example?: {
        question: string;
        answer: string[];
    };
    note?: string;
}

export interface LogicFormula {
    id: string;
    category: string;
    description: string;
    keywords?: string[];
    variations: FormulaVariation[]; 
    skeleton: string[]; 
}

export enum AccentType {
  US = "American",
  UK = "British"
}

export enum AppTheme {
    LIGHT = "light",
    DARK = "dark"
}

export type LanguageMode = 'cn' | 'en';

export interface UserProfile {
  name: string;
  language: LanguageMode;
  theme?: AppTheme;
  targetScore: string;
  preferredAccent: AccentType;
  preferredVoiceId: string;
  playbackSpeed: number;
  useGoldenFormulas?: boolean; 
  customFormulas?: LogicFormula[]; 
  disabledFormulaIds?: string[];
  part1Preference?: number; 
  
  // --- Target Score & Preferences ---
  targetScoreSpeaking?: string;   // 雅思口语目标分
  targetScoreDetail?: string;     // 用户补充的难易度/类型偏好

  // --- 1. 身份与能力 (Identity & Ability) ---
  identity_role?: string;         // 工作/学习 (Job/Study)
  identity_education?: string;    // 教育背景 (Education)
  identity_skills?: string;       // 技能/特长 (Skills/Ability) - e.g. Cooking, Coding
  
  // --- 2. 生活方式 (Lifestyle) ---
  life_daily_routine?: string;    // 作息 (Sleep/Routine)
  life_clothes?: string;          // 衣服/时尚 (Clothes/Fashion)
  life_food?: string;             // 食物/饮食 (Food/Diet)
  life_health?: string;           // 健康/运动 (Health/Sports)
  life_transport?: string;        // 交通方式 (Transport)
  life_objects?: string;          // 物品/极简主义 (Objects/Materialism)

  // --- 3. 环境与居住 (Environment) ---
  env_city_country?: string;      // 城市vs乡村 (City/Countryside)
  env_housing?: string;           // 居住环境 (Accommodation/Places)
  env_architecture?: string;      // 建筑喜好 (Architecture)
  env_safety?: string;            // 犯罪/安全感 (Crime/Safety)

  // --- 4. 社交与情感 (Social & Emotion) ---
  social_style?: string;          // 社交偏好 (Social/Friends)
  social_media?: string;          // 社交媒体态度 (Social Media)
  social_family?: string;         // 亲子/家庭观念 (Parenting/Family)
  social_conflict?: string;       // 投诉/冲突处理 (Complaints/Conflict)
  social_generations?: string;    // 老少观念 (Old/Young)

  // --- 5. 精神与心理 (Inner Self) ---
  mind_personality?: string;      // 人设/性格 (Personality/MBTI)
  mind_emotion?: string;          // 情绪管理 (Emotions)
  mind_meditation?: string;       // 冥想/独处 (Meditation/Relaxation)
  
  // --- 6. 文化与兴趣 (Culture & Interests) ---
  interest_art?: string;          // 艺术/音乐 (Art/Music)
  interest_movies?: string;       // 电影/娱乐 (Movies)
  interest_history?: string;      // 历史/传统 (History)
  interest_travel?: string;       // 旅游/地点 (Travel/Places)

  // --- 7. 宏观价值观 (Worldview) ---
  value_money?: string;           // 金钱观 (Money/Shopping)
  value_science?: string;         // 科技态度 (Science/AI)
  value_advertising?: string;     // 广告态度 (Advertising)
  value_environment?: string;     // 环境观 (Environment/Climate)
  value_success?: string;         // 成功定义 (Success/Work)
  value_tradition?: string;       // 传统与现代 (Tradition/Modernity)
  value_globalization?: string;   // 全球化 (Globalization/Culture)

  // --- New: Supplementary Notes for Specific Dimensions ---
  // Key: field name (e.g., 'life_food'), Value: user note (e.g., "But I hate coriander")
  persona_notes?: Record<string, string>;

  // --- 8. 开放补充 ---
  interest_keywords?: string;     // 具体喜欢的事物 (Guitar, Spicy Food...)
  user_defined_persona?: string;  // 补充说明

  // Generated System Prompt (Internal Use)
  generatedPersona?: string; 
  inspiration?: string; 
  
  // Legacy fields (kept for compatibility)
  role?: string; major?: string; hobbies?: string; targetScoreWriting?: string; interests?: string; people?: string; goals?: string; favoriteTopics?: string; importantExperiences?: string; invitationCode?: string;
}

export interface PronunciationResult {
    score: number;
    accuracyScore?: number;
    fluencyScore?: number;
    integrityScore?: number;
    feedback: string;
    mistakes: string[];
    audioBlob?: Blob; 
}

export interface VoiceOption {
    id: string;
    label: string;
    geminiVoiceName?: string;
    gender?: 'male' | 'female';
    isUser?: boolean;
    audioData?: string; 
    isProfile?: boolean; 
    voiceSettings?: any;
}

export interface P2Result {
    title: string;
    content: string; // Raw text if needed
    sentences: SentenceData[]; // Structured data
    logic: string;
}

export type ExamStage = 'loading' | 'intro' | 'part1' | 'part2_intro' | 'part2_prep' | 'part2_speak' | 'part3' | 'concluded' | 'setup' | 'report';

export interface ExamMessage {
    role: 'examiner' | 'candidate';
    text: string;
    audioUrl?: string;
}

export interface ExamReport {
    overallScore: number;
    fluency: number;
    vocabulary: number;
    grammar: number;
    pronunciation: number;
    expressionFeedback: string;
    part1Feedback: string;
    part2Feedback: string;
    part3Feedback: string;
    optimizedSentences: {
        original: string;
        improved: string;
        reason: string;
    }[];
}

export type ListeningQuestionType = 
    "Gap Filling" | 
    "Multiple Choice" | 
    "Matching" | 
    "Map/Plan Labelling" | 
    "Flow-chart/Process" | 
    "Short Answer" | 
    "Sentence Completion" |
    "Mixed" |
    string;

export interface ListeningEntry {
    id: string;
    timestamp: number;
    originalText: string;
    analyzedContent: string; 
    sourceTitle: string;
    questionType: ListeningQuestionType;
    summary?: string;
}
