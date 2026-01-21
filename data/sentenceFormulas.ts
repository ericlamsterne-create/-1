
import { LogicFormula } from '../types';

// Markup Guide:
// <Y>...</Y> = Yellow (Main Reason / Core / Structure) - bg-[#FFF9C4]
// <P>...</P> = Blue/Purple (Method / Condition / Explanation) - bg-[#E1BEE7] or Blue
// <G>...</G> = Green (Impact / Result / Details) - bg-[#DCEDC8]
// <B>...</B> = Bold (English Fixed Phrases)

export const SENTENCE_FORMULAS: LogicFormula[] = [
    {
        id: "formula_why",
        category: "Why类",
        description: "Reason & Impact",
        keywords: ["why", "reason", "cause"],
        skeleton: ["The main reason is that..."], 
        variations: [
            {
                title: "判定公式：题目中带 why",
                note: "注意：各原因之间应为并列关系，如果是P3可加入举例",
                skeleton: [
                    "<Y><B>The main reason is that/for starters</B> 原因A</Y>",
                    "<P><B>by</B> 方式 <B>with</B> 人/物</P>",
                    "<G><B>to</B> 影响.</G>",
                    "<Y><B>I also want to point that/On top of that, another key reason is because by</B> 原因B</Y>",
                    "<P><B>it can</B> 功能</P>",
                    "<G><B>Which</B> 影响.</G>"
                ],
                example: {
                    question: "Why do you like studying in the library?",
                    answer: [
                        "<B>The main reason is that</B> it can help individuals relax <B>by</B> offering a quiet environment <B>with</B> some comfortable seats <B>to</B> make the learning process more enjoyable.",
                        "<B>On top of that, another key reason is because by</B> using the search engines there, <B>it can</B> provide instant information, <B>which</B> helps me solve problems much faster."
                    ]
                }
            }
        ]
    },
    {
        id: "formula_like",
        category: "喜好类",
        description: "Like/Enjoy/Favorite",
        keywords: ["like", "enjoy", "favorite", "keen on", "love"],
        skeleton: ["I am keen on..."],
        variations: [
            {
                title: "1. 特殊疑问句形式的 like 问题 (What kinds of?)",
                skeleton: [
                    "<Y><B>Well. I am keen on lots of/I have a passion for</B> 题目关键词.</Y>",
                    "<Y><B>As for/Speaking of</B> 分类A</Y>",
                    "<G><B>I like/X is totally my thing</B> 分类A-细分</G>",
                    "<P><B>because</B> 方式 <B>to</B> 影响 <B>with</B> 人/物</P>",
                    "<Y><B>And in terms of/when it come to</B> 分类B</Y>",
                    "<G><B>I am really into/I prefer</B> 分类B-细分</G>",
                    "<P><B>since</B> 方式 <B>to</B> 影响 <B>with</B> 人/物</P>"
                ],
                example: {
                    question: "What kind of apps do you like using?",
                    answer: [
                        "<B>Well, I am keen on lots of</B> mobile applications. <B>As for</B> social media, <B>I like</B> using WeChat <B>because</B> it's the easiest way <B>to</B> keep in touch with my friends.",
                        "<B>And in terms of</B> entertainment, <B>I am into</B> Douyin <B>since</B> it provides me <B>with</B> lots of funny videos <B>to</B> wind down."
                    ]
                }
            },
            {
                title: "2. 一般疑问句形式的 like 问题 (Do you like?)",
                note: "可加 since 解释原因（拿手的问题多说点）",
                skeleton: [
                    "<Y><B>Yes, definitely. Well, it depends on</B> 情况</Y>",
                    "<Y><B>If</B> 条件A,</Y>",
                    "<G><B>then I</B> 动作.</G>",
                    "<Y><B>But if/On the other hand, if</B> 条件B,</Y>",
                    "<G><B>then I</B> 动作.</G>"
                ],
                example: {
                    question: "Do you like using mobile apps?",
                    answer: [
                        "Yes, definitely. <B>Well, it depends on</B> what I'm doing at the moment.",
                        "<B>If</B> I want to be productive or talk to people, <B>then</B> WeChat is totally my thing <B>because</B> it's the most efficient way <B>to keep in touch with</B> my friends and colleagues.",
                        "<B>But if</B> I'm just feeling a bit bored and want some fun, <B>then I would prefer</B> Douyin <B>since</B> it provides me with plenty of funny videos to wind down."
                    ]
                }
            }
        ]
    },
    {
        id: "formula_prefer",
        category: "偏好类",
        description: "Prefer/Choice",
        keywords: ["prefer", "rather", "choice"],
        skeleton: ["If I were to pick..."],
        variations: [
            {
                title: "判定公式：题目中带 prefer",
                skeleton: [
                    "<Y><B>Actually, if I were to pick, I'd go for</B> 选项A</Y>",
                    "<P><B>mainly because it allows me to</B> 核心优势 <B>by</B> 具体方式.</P>",
                    "<G><B>Whereas/On the other hand</B> 选项B <B>is a bit too</B> 缺点 <B>for my liking</B>.</G>"
                ],
                example: {
                    question: "Do you prefer tea or coffee?",
                    answer: [
                        "<B>Actually, if I were to pick, I'd go for</B> coffee",
                        "<B>mainly because it allows me to</B> stay awake <B>by</B> giving me a strong caffeine boost in the morning.",
                        "<B>Whereas</B> tea <B>is a bit too</B> mild <B>for my liking</B>."
                    ]
                }
            }
        ]
    },
    {
        id: "formula_viewpoint",
        category: "观点类",
        description: "Opinion/View",
        keywords: ["do you think", "agree", "opinion", "believe"],
        skeleton: ["From my perspective..."],
        variations: [
            {
                title: "判定公式：题目中带 think",
                note: "注意：正方论证AB+为反方说话。很多题目会带think，考场中要灵活区分，思考下题目想要你侧重表达的是哪一类（优化）。",
                skeleton: [
                    "<Y><B>From my perspective, I definitely think that</B> 核心观点</Y>",
                    "<P><B>This is largely due to the fact that</B> 原因A <B>which means</B> 进一步解释</P>",
                    "<G><B>Although I must admit that sometimes</B> 让步(反方观点), <B>I still believe</B> 重申正方.</G>"
                ],
                example: {
                    question: "Do you think children should learn painting?",
                    answer: [
                        "<B>From my perspective, I definitely think that</B> children should learn to paint.",
                        "<B>This is largely due to the fact that</B> it fosters creativity, <B>which means</B> they can express their emotions better.",
                        "<B>Although I must admit that sometimes</B> it can be messy, <B>I still believe</B> the artistic benefits are invaluable."
                    ]
                }
            }
        ]
    },
    {
        id: "formula_broad",
        category: "大范围类",
        description: "People/Society",
        keywords: ["people", "popular", "china"],
        skeleton: ["Generally speaking..."],
        variations: [
            {
                title: "判定公式：问People/Popular/China",
                skeleton: [
                    "<Y><B>Well, generally speaking/From what I've seen</B> 普遍现象/趋势</Y>",
                    "<P><B>For the majority of</B> 人群A, <B>they tend to</B> 动作A <B>as</B> 原因A.</P>",
                    "<G><B>While for others, especially</B> 人群B, <B>they are more likely to</B> 动作B.</G>"
                ]
            }
        ]
    },
    {
        id: "formula_habit",
        category: "个人习惯类",
        description: "Habits/Routine",
        keywords: ["usually", "often", "routine", "every day"],
        skeleton: ["As a rule of thumb..."],
        variations: [
            {
                title: "判定公式：题目中带 usually/do you...",
                skeleton: [
                    "<Y><B>As a rule of thumb, I usually</B> 核心习惯 <B>when</B> 时间/场景</Y>",
                    "<P><B>Since I believe it helps me to</B> 好处/目的.</P>",
                    "<G><B>However, once in a blue moon, I might</B> 例外情况 <B>if</B> 特殊条件.</G>"
                ]
            }
        ]
    },
    {
        id: "formula_frequency",
        category: "频率类",
        description: "How often",
        keywords: ["how often"],
        skeleton: ["Every now and then..."],
        variations: [
            {
                title: "判定公式：题目中带 How often",
                skeleton: [
                    "<Y><B>Well, I do this every now and then/on a daily basis.</B></Y>",
                    "<P><B>Normally, I would</B> 动作 <B>whenever</B> 触发条件.</P>",
                    "<G><B>It's a great way to</B> 好处.</G>"
                ]
            }
        ]
    },
    {
        id: "formula_time_util",
        category: "时间利用类",
        description: "Time/Weekend",
        keywords: ["free time", "weekend"],
        skeleton: ["I tend to spend my time..."],
        variations: [
            {
                title: "判定公式：Free time/Weekend",
                skeleton: [
                    "<Y><B>When I have some spare time, I tend to</B> 主要活动</Y>",
                    "<P><B>I find it really</B> 形容词 (relaxing/useful) <B>to</B> 细节.</P>",
                    "<G><B>Sometimes I also</B> 次要活动 <B>just to switch things up.</B></G>"
                ]
            }
        ]
    },
    {
        id: "formula_future",
        category: "未来相关类",
        description: "Future/Plan",
        keywords: ["future", "will", "going to"],
        skeleton: ["I suspect that..."],
        variations: [
            {
                title: "判定公式：题目中带 Future/Will",
                skeleton: [
                    "<Y><B>Actually, I am not that sure, but I suspect that</B> 预测现象</Y>",
                    "<P><B>Ideally, I hope to</B> 个人计划/愿景 <B>in the next few years.</B></P>",
                    "<G><B>Because this will allow me to</B> 目的/好处.</G>"
                ]
            }
        ]
    },
    {
        id: "formula_pros_cons",
        category: "优缺点类",
        description: "Pros & Cons",
        keywords: ["advantage", "benefit", "drawback"],
        skeleton: ["The upsides are..."],
        variations: [
            {
                title: "判定公式：Advantage/Disadvantage",
                skeleton: [
                    "<Y><B>Well, the upsides are clearly that</B> 优点A <B>and</B> 优点B.</Y>",
                    "<P><B>This is great for</B> 受益人群.</P>",
                    "<G><B>However, the downsides are that</B> 缺点 <B>which might be an issue.</B></G>"
                ]
            }
        ]
    },
    {
        id: "formula_time_compare",
        category: "时间对比类",
        description: "Past vs Present",
        keywords: ["changed", "past", "compare"],
        skeleton: ["A lot has changed..."],
        variations: [
            {
                title: "判定公式：Change/Past/Now",
                skeleton: [
                    "<Y><B>A lot has changed since the past. Back in the days,</B> 过去的情况.</Y>",
                    "<P><B>But nowadays/Over the years,</B> 现在的变化.</P>",
                    "<G><B>I guess this is mainly due to</B> 变化的原因 (technology/economy).</G>"
                ]
            }
        ]
    },
    {
        id: "formula_obj_compare",
        category: "对比类",
        description: "Compare A & B",
        keywords: ["difference", "compare"],
        skeleton: ["There are several differences..."],
        variations: [
            {
                title: "判定公式：Difference/Compare",
                skeleton: [
                    "<Y><B>Well, there are several differences. The most obvious one is</B> 区别点A.</Y>",
                    "<P><B>A is usually</B> 特征A, <B>while B tends to be</B> 特征B.</P>",
                    "<G><B>Another key distinction is that</B> 区别点B.</G>"
                ]
            }
        ]
    },
    {
        id: "formula_solution",
        category: "问题解决类",
        description: "Solution",
        keywords: ["solve", "solution", "how can"],
        skeleton: ["The best way to tackle this..."],
        variations: [
            {
                title: "判定公式：How can/Solve",
                skeleton: [
                    "<Y><B>I think the best way to tackle this is to</B> 核心方案.</Y>",
                    "<P><B>For example, the government could</B> 措施A.</P>",
                    "<G><B>At the same time, individuals should also</B> 措施B <B>to help out.</B></G>"
                ]
            }
        ]
    }
];
