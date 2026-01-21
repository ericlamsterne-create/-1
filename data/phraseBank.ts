
export interface PhraseItem {
    id: number;
    cn: string;
    en: string;
    phrases: string[];
}

export const PHRASE_BANK: PhraseItem[] = [
  // --- Relaxing / Feelings (Part 1/2) ---
  {
    "id": 1,
    "cn": "我经常听音乐，因为它很放松，能帮我从烦心事中解脱出来。",
    "en": "I listen to music all the time because it's relaxing and it helps me take my mind off things.",
    "phrases": ["take my mind off things", "relaxing"]
  },
  {
    "id": 2,
    "cn": "去公园散步对我来说真的很治愈，能帮我减压。",
    "en": "Going for a stroll in the park is really therapeutic for me; it helps me reduce stress.",
    "phrases": ["go for a stroll", "therapeutic", "reduce stress"]
  },
  {
    "id": 3,
    "cn": "听这首歌让我心情变好，感觉非常轻松。",
    "en": "Listening to this song puts me in a better mood and helps me unwind.",
    "phrases": ["puts me in a better mood", "unwind"]
  },
  {
    "id": 4,
    "cn": "我和朋友们玩得很开心，这真是一个很好的解压方式。",
    "en": "I had a blast with my friends; it was a wonderful stress-buster.",
    "phrases": ["had a blast", "stress-buster"]
  },
  
  // --- Daily Life / Habits (Part 1) ---
  {
    "id": 5,
    "cn": "我每天都使用这个应用，它是我生活中不可或缺的一部分。",
    "en": "I use this app on a daily basis; it's become an indispensable part of my life.",
    "phrases": ["on a daily basis", "indispensable"]
  },
  {
    "id": 6,
    "cn": "我现在很少去实体店了，因为网购实在是太方便了。",
    "en": "I seldom go to brick-and-mortar stores now because online shopping is just so convenient.",
    "phrases": ["brick-and-mortar stores", "convenient"]
  },
  {
    "id": 7,
    "cn": "说实话，我不是那种早起的人，我喜欢睡懒觉。",
    "en": "To be honest, I'm not a morning person; I like to sleep in on weekends.",
    "phrases": ["morning person", "sleep in"]
  },
  {
    "id": 8,
    "cn": "在空闲时间，我通常会和朋友闲聊或者看电影。",
    "en": "In my spare time, I usually shoot the breeze with friends or catch a movie.",
    "phrases": ["shoot the breeze", "spare time"]
  },

  // --- Decisions / Opinions (Part 3) ---
  {
    "id": 9,
    "cn": "这真的是一个棘手的问题，但我认为利大于弊。",
    "en": "That's a tricky question, but I think the pros outweigh the cons.",
    "phrases": ["tricky question", "pros outweigh the cons"]
  },
  {
    "id": 10,
    "cn": "这完全取决于具体情况，并没有唯一的正确答案。",
    "en": "It really depends on the situation; there isn't a single right answer.",
    "phrases": ["depends on the situation"]
  },
  {
    "id": 11,
    "cn": "通过反复试验，我终于找到了解决问题的方法。",
    "en": "Through trial and error, I finally figured out how to solve the problem.",
    "phrases": ["trial and error", "figured out"]
  },
  {
    "id": 12,
    "cn": "如果要我选，我会选择住在这个城市，因为交通便利。",
    "en": "If I were to pick, I'd choose to live in this city because of the convenient transport.",
    "phrases": ["If I were to pick"]
  },

  // --- People / Relationships ---
  {
    "id": 13,
    "cn": "我们有很多共同点，所以我们一见如故。",
    "en": "We have a lot in common, so we hit it off immediately.",
    "phrases": ["have a lot in common", "hit it off"]
  },
  {
    "id": 14,
    "cn": "她是我非常尊敬的人，她是我的榜样。",
    "en": "She is someone I really look up to; she is a role model for me.",
    "phrases": ["look up to", "role model"]
  },
  {
    "id": 15,
    "cn": "为了合群，青少年有时候会模仿朋友的行为。",
    "en": "To fit in, teenagers sometimes copy their friends' behavior.",
    "phrases": ["fit in"]
  },

  // --- Travel / Experience ---
  {
    "id": 16,
    "cn": "那次旅行绝对值得，风景令人叹为观止。",
    "en": "The trip was totally worth it; the scenery was breathtaking.",
    "phrases": ["worth it", "breathtaking"]
  },
  {
    "id": 17,
    "cn": "我想去一个偏僻安静的地方，远离城市的喧嚣。",
    "en": "I want to go somewhere off the beaten track to get away from the hustle and bustle of the city.",
    "phrases": ["off the beaten track", "hustle and bustle"]
  },
  {
    "id": 18,
    "cn": "这让我大开眼界，我从未见过这样的东西。",
    "en": "It was a real eye-opener for me; I had never seen anything like it.",
    "phrases": ["eye-opener"]
  },

  // --- Technology / Future ---
  {
    "id": 19,
    "cn": "不管我们喜不喜欢，人工智能正在改变我们的生活方式。",
    "en": "Whether we like it or not, AI is transforming the way we live.",
    "phrases": ["Whether we like it or not"]
  },
  {
    "id": 20,
    "cn": "如果我们过度依赖科技，可能会失去独立思考的能力。",
    "en": "If we rely too much on technology, we might lose the ability to think independently.",
    "phrases": ["rely too much on"]
  },
  
  // --- High Frequency Idioms/Collocations ---
  {
    "id": 21,
    "cn": "这不是什么深奥难懂的事，只要多练习就行。",
    "en": "It's not rocket science; you just need to practice more.",
    "phrases": ["not rocket science"]
  },
  {
    "id": 22,
    "cn": "我不喜欢随波逐流，我喜欢做自己。",
    "en": "I don't like to follow the crowd; I prefer to be myself.",
    "phrases": ["follow the crowd"]
  },
  {
    "id": 23,
    "cn": "这这简直是抢钱（太贵了），我不打算买。",
    "en": "It was highway robbery, so I didn't buy it.",
    "phrases": ["highway robbery"]
  },
  {
    "id": 24,
    "cn": "这是千载难逢的机会，我不想错过。",
    "en": "It's a once in a blue moon opportunity, and I don't want to miss it.",
    "phrases": ["once in a blue moon"]
  },
  {
     "id": 25,
     "cn": "我当时太紧张了，脑子一片空白。",
     "en": "I was so nervous that my mind went totally blank.",
     "phrases": ["mind went totally blank"]
  },
  {
     "id": 26,
     "cn": "我需要休假几天来养精蓄锐，恢复精力。",
     "en": "I need to take a few days off to recharge my batteries.",
     "phrases": ["recharge my batteries"]
  },
  {
     "id": 27,
     "cn": "出国留学确实开阔了我的眼界，让我接触到了不同的文化。",
     "en": "Studying abroad really broadened my horizons and exposed me to different cultures.",
     "phrases": ["broadened my horizons"]
  }
];
