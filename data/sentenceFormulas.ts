
export interface LogicFormula {
    id: string;
    category: string; // e.g., "Why", "Like", "Compare"
    description: string;
    skeleton: string[]; // The fixed phrases to use
}

export const SENTENCE_FORMULAS: LogicFormula[] = [
    {
        id: "formula_1",
        category: "Why / Reason",
        description: "解释原因类 (First... On top of that...)",
        skeleton: ["First of all, it’s because", "On top of that, another reason is because", "it can"]
    },
    {
        id: "formula_2_keen",
        category: "Like / Preference",
        description: "喜好类-特殊疑问 (Keen on... As for...)",
        skeleton: ["Well, I am keen on lots of", "As for", "I like", "because", "And in terms of", "I am into", "since"]
    },
    {
        id: "formula_2_depends",
        category: "Like / Preference",
        description: "喜好类-一般疑问/分情况 (It depends... If...)",
        skeleton: ["Well, it depends", "If", "then I", "But if"]
    },
    {
        id: "formula_3",
        category: "Prefer / Choice",
        description: "选择类 (If I were to pick...)",
        skeleton: ["Actually, if I were to pick, I would probably go with", "I feel", "so I am gonna go with"]
    },
    {
        id: "formula_4",
        category: "Think / Opinion",
        description: "观点/评价类 (Direct + Positive + Positive + If not)",
        skeleton: ["I reckon that", "It is beneficial because", "If we don't"]
    },
    {
        id: "formula_5_general",
        category: "People / General",
        description: "大群体类 (Generally speaking... But others...)",
        skeleton: ["Generally speaking", "But there are also other people who", "so they"]
    },
    {
        id: "formula_5_observation",
        category: "People / Observation",
        description: "观察类 (From what I can see...)",
        skeleton: ["Actually, I am not that sure, but from what I can see from people around me", "they tend to", "But maybe for others, they will probably", "since"]
    },
    {
        id: "formula_6",
        category: "Habit / Frequency",
        description: "习惯类 (Most of time... But like when...)",
        skeleton: ["Well, most of time, I", "because", "but like when", "then I will"]
    },
    {
        id: "formula_7",
        category: "Time Usage",
        description: "时间分配类 (Sometimes... And other times...)",
        skeleton: ["Sometimes, I do", "And other times, if", "then I will do"]
    },
    {
        id: "formula_8",
        category: "Frequency",
        description: "频率类 (A lot / Every now and then)",
        skeleton: ["I do something a lot, like maybe", "times a", "I do something every now and then"]
    },
    {
        id: "formula_10_plan",
        category: "Future / Plan",
        description: "未来计划 (From what I can see so far...)",
        skeleton: ["Actually, I am not that sure, but from what I can see so far, I plan to", "and maybe when"]
    },
    {
        id: "formula_10_hypothetical",
        category: "Future / Hypothetical",
        description: "未来假设 (Currently... In the future...)",
        skeleton: ["Yeah I would, but currently", "and in the future when", "then I would like to do it because"]
    },
    {
        id: "formula_11",
        category: "Pros and Cons",
        description: "优缺点 (The beauty of... The drawbacks...)",
        skeleton: ["Well, the beauty of something are that for one, it's", "as well as", "and on the other hand, the drawbacks are that"]
    },
    {
        id: "formula_12",
        category: "Time Comparison",
        description: "时间对比 (A lot has changed... Back in the days...)",
        skeleton: ["A lot has changed since the past", "back in the days", "was", "for example", "Over the years", "everything started to", "and now it's"]
    },
    {
        id: "formula_13",
        category: "Comparison A vs B",
        description: "事物对比 (A is... compared to B...)",
        skeleton: ["compared to", "like for instance", "In contrast", "is", "than", "For example"]
    },
    {
        id: "formula_14",
        category: "Problem Solving",
        description: "解决问题 (It would help if...)",
        skeleton: ["It would help if", "This is largely due to", "Unless we", "this issue cannot be solved"]
    }
];
