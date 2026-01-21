
export interface PhoneticSymbol {
    symbol: string;
    word: string;
    type: 'vowel' | 'consonant' | 'diphthong';
    example: string;
}

export const PHONETICS_DATA: PhoneticSymbol[] = [
    // Monophthongs (Vowels)
    { symbol: "i:", word: "sheep", type: "vowel", example: "I see a sheep." },
    { symbol: "ɪ", word: "ship", type: "vowel", example: "The ship is big." },
    { symbol: "e", word: "bed", type: "vowel", example: "Go to bed." },
    { symbol: "æ", word: "cat", type: "vowel", example: "A fat cat." },
    { symbol: "ɑ:", word: "father", type: "vowel", example: "My father is tall." },
    { symbol: "ɒ", word: "hot", type: "vowel", example: "It is hot today." },
    { symbol: "ɔ:", word: "door", type: "vowel", example: "Open the door." },
    { symbol: "ʊ", word: "book", type: "vowel", example: "Read a book." },
    { symbol: "u:", word: "moon", type: "vowel", example: "Look at the moon." },
    { symbol: "ʌ", word: "cup", type: "vowel", example: "A cup of tea." },
    { symbol: "ɜ:", word: "bird", type: "vowel", example: "A blue bird." },
    { symbol: "ə", word: "teacher", type: "vowel", example: "She is a teacher." },

    // Diphthongs
    { symbol: "eɪ", word: "day", type: "diphthong", example: "Have a nice day." },
    { symbol: "aɪ", word: "eye", type: "diphthong", example: "Close your eyes." },
    { symbol: "ɔɪ", word: "boy", type: "diphthong", example: "He is a boy." },
    { symbol: "əʊ", word: "go", type: "diphthong", example: "Let's go home." },
    { symbol: "aʊ", word: "cow", type: "diphthong", example: "A brown cow." },
    { symbol: "ɪə", word: "ear", type: "diphthong", example: "I hear with my ear." },
    { symbol: "eə", word: "hair", type: "diphthong", example: "Long hair." },
    { symbol: "ʊə", word: "tour", type: "diphthong", example: "On a tour." },

    // Consonants (Voiceless)
    { symbol: "p", word: "pen", type: "consonant", example: "A red pen." },
    { symbol: "t", word: "tea", type: "consonant", example: "Hot tea." },
    { symbol: "k", word: "key", type: "consonant", example: "Where is the key?" },
    { symbol: "f", word: "fish", type: "consonant", example: "Fresh fish." },
    { symbol: "θ", word: "thin", type: "consonant", example: "A thin line." },
    { symbol: "s", word: "sun", type: "consonant", example: "The sun shines." },
    { symbol: "ʃ", word: "shoe", type: "consonant", example: "New shoes." },
    { symbol: "tʃ", word: "chair", type: "consonant", example: "Sit on the chair." },
    { symbol: "h", word: "hat", type: "consonant", example: "Wear a hat." },

    // Consonants (Voiced)
    { symbol: "b", word: "bag", type: "consonant", example: "A big bag." },
    { symbol: "d", word: "dog", type: "consonant", example: "Good dog." },
    { symbol: "g", word: "go", type: "consonant", example: "Let's go." },
    { symbol: "v", word: "van", type: "consonant", example: "A white van." },
    { symbol: "ð", word: "this", type: "consonant", example: "This is it." },
    { symbol: "z", word: "zoo", type: "consonant", example: "Visit the zoo." },
    { symbol: "ʒ", word: "vision", type: "consonant", example: "Good vision." },
    { symbol: "dʒ", word: "jump", type: "consonant", example: "Jump high." },
    { symbol: "m", word: "man", type: "consonant", example: "A strong man." },
    { symbol: "n", word: "no", type: "consonant", example: "Say no." },
    { symbol: "ŋ", word: "sing", type: "consonant", example: "Sing a song." },
    { symbol: "l", word: "leg", type: "consonant", example: "My leg hurts." },
    { symbol: "r", word: "red", type: "consonant", example: "Red apple." },
    { symbol: "w", word: "wet", type: "consonant", example: "Wet floor." },
    { symbol: "j", word: "yes", type: "consonant", example: "Yes please." },
];
