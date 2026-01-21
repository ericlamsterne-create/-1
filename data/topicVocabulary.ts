
// Source: 雅思口语词汇场景分类大全
// Structured for auto-matching in the app

export interface TopicWord {
    cn: string;
    en: string;
    category: string;
}

// Flattened list for easier searching, grouped conceptually
export const TOPIC_VOCABULARY: TopicWord[] = [
    // 1.1 个人介绍
    { cn: "核心家庭", en: "nuclear family", category: "Personal" },
    { cn: "大家庭", en: "extended family", category: "Personal" },
    { cn: "单亲家庭", en: "single-parent family", category: "Personal" },
    { cn: "代沟", en: "generation gap", category: "Personal" },
    { cn: "家谱", en: "family tree", category: "Personal" },
    { cn: "昵称", en: "nickname", category: "Personal" },
    { cn: "善解人意的", en: "caring", category: "Personal" },
    { cn: "坦率的", en: "frank", category: "Personal" },
    { cn: "勤劳的", en: "industrious", category: "Personal" },
    { cn: "性格", en: "personality", category: "Personal" },
    { cn: "乐观的", en: "optimistic", category: "Personal" },
    { cn: "悲观的", en: "pessimistic", category: "Personal" },
    { cn: "内向的", en: "introvert", category: "Personal" },
    { cn: "外向的", en: "extrovert", category: "Personal" },
    { cn: "随和的", en: "easy-going", category: "Personal" },

    // 1.2 家乡与天气
    { cn: "特产", en: "specialty / local product", category: "Hometown" },
    { cn: "饺子", en: "dumpling / Jiaozi", category: "Hometown" },
    { cn: "主食", en: "staple food", category: "Hometown" },
    { cn: "小吃", en: "snack / refreshment", category: "Hometown" },
    { cn: "风景如画", en: "picturesque", category: "Hometown" },
    { cn: "生活节奏", en: "pace of life", category: "Hometown" },
    { cn: "繁华的", en: "bustling", category: "Hometown" },
    { cn: "拥挤的", en: "crowded / congested", category: "Hometown" },
    { cn: "潮湿的", en: "humid / moist", category: "Weather" },
    { cn: "暴雨", en: "downpour / torrential rain", category: "Weather" },
    { cn: "毛毛雨", en: "drizzle", category: "Weather" },
    { cn: "微风", en: "breeze", category: "Weather" },
    { cn: "寒冷的", en: "chilly", category: "Weather" },
    { cn: "温和的", en: "mild", category: "Weather" },

    // 1.6 体育
    { cn: "有氧运动", en: "aerobic exercise", category: "Sports" },
    { cn: "健身房", en: "gym / gymnasium", category: "Sports" },
    { cn: "增强体质", en: "build up physique", category: "Sports" },
    { cn: "缓解压力", en: "relieve stress", category: "Sports" },
    { cn: "团队精神", en: "team spirit", category: "Sports" },
    { cn: "极限运动", en: "extreme sports", category: "Sports" },
    { cn: "马拉松", en: "marathon", category: "Sports" },
    { cn: "裁判", en: "referee", category: "Sports" },

    // 1.8 职业与工作
    { cn: "简历", en: "CV / resume", category: "Work" },
    { cn: "跳槽", en: "job-hopping", category: "Work" },
    { cn: "升职", en: "get promoted / promotion", category: "Work" },
    { cn: "加班", en: "work overtime", category: "Work" },
    { cn: "工作量", en: "workload", category: "Work" },
    { cn: "薪水", en: "salary / wage", category: "Work" },
    { cn: "福利", en: "benefit / welfare", category: "Work" },
    { cn: "失业", en: "unemployment / laid-off", category: "Work" },
    { cn: "职业满意度", en: "job satisfaction", category: "Work" },
    { cn: "工作狂", en: "workaholic", category: "Work" },

    // 3.5 媒体与广告
    { cn: "商业广告", en: "commercial", category: "Media" },
    { cn: "黄金时段", en: "prime time", category: "Media" },
    { cn: "头条", en: "headline", category: "Media" },
    { cn: "名人", en: "celebrity", category: "Media" },
    { cn: "八卦", en: "gossip", category: "Media" },
    { cn: "误导性的", en: "misleading", category: "Media" },
    { cn: "审查", en: "censorship", category: "Media" },
    { cn: "目标受众", en: "target audience", category: "Media" },

    // 3.6 环境与社会
    { cn: "污染", en: "contamination / pollution", category: "Environment" },
    { cn: "全球变暖", en: "global warming", category: "Environment" },
    { cn: "可再生能源", en: "renewable energy", category: "Environment" },
    { cn: "濒危物种", en: "endangered species", category: "Environment" },
    { cn: "一次性的", en: "disposable", category: "Environment" },
    { cn: "环保的", en: "eco-friendly / environmentally friendly", category: "Environment" },
    { cn: "雾霾", en: "haze / smog", category: "Environment" },
    { cn: "可持续发展", en: "sustainable development", category: "Environment" },
    { cn: "性别歧视", en: "gender discrimination / sexism", category: "Society" },
    { cn: "老龄化社会", en: "aging society", category: "Society" },
    
    // 1.11 食品
    { cn: "清淡的", en: "light / mild", category: "Food" },
    { cn: "油腻的", en: "greasy / oily", category: "Food" },
    { cn: "素食主义者", en: "vegetarian", category: "Food" },
    { cn: "外卖", en: "takeaway / take-out", category: "Food" },
    { cn: "自助餐", en: "buffet", category: "Food" },
    { cn: "食谱", en: "recipe", category: "Food" },
    { cn: "配料", en: "ingredient", category: "Food" },
    { cn: "均衡饮食", en: "balanced diet", category: "Food" },
    
    // 3.10 旅游
    { cn: "纪念品", en: "souvenir", category: "Travel" },
    { cn: "名胜古迹", en: "places of interest / historical sites", category: "Travel" },
    { cn: "旺季", en: "peak season", category: "Travel" },
    { cn: "淡季", en: "off season", category: "Travel" },
    { cn: "开阔眼界", en: "broaden one's horizons", category: "Travel" },
    { cn: "风景", en: "scenery / landscape", category: "Travel" },
    { cn: "当地文化", en: "local culture", category: "Travel" },
];
