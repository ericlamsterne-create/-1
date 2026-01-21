
export const SCENE_VOCABULARY: Record<string, string[]> = {
    accommodation: [
      "tenant", "landlord", "landlady", "resident", "occupant", "roommate", "applicant", "neighborhood",
      "homestay", "residence", "location", "district", "dwelling", "surroundings", "community", "property",
      "urban area", "rural area", "countryside", "village", "cottage", "suburb", "outskirt", "landmark", "downtown",
      "apartment", "flat", "studio", "house", "high-rise", "hall of residence", "parking", "balcony", "garage", "yard", "garden",
      "rent", "deposit", "bill", "electricity bill", "gas bill", "budget", "lease", "contract",
      "furniture", "kettle", "laundry", "heater", "microwave", "air conditioning", "alarm system"
    ],
    tour: [
      "vacation", "guided tour", "self-drive tour", "excursion", "business trip", "schedule", "reservation",
      "express train", "shuttle", "flight", "helicopter", "ferry", "reception", "passenger", "luggage",
      "scenery", "landscape", "waterfall", "landmark", "embassy", "terminal", "resort", "souvenir",
      "art gallery", "museum", "castle", "ancient fort", "theme park", "itinerary", "booking"
    ],
    job: [
      "vacancy", "occupation", "opportunity", "promotion", "part-time", "shift", "training", "day off",
      "CV", "curriculum vitae", "cooperative", "status", "security", "workplace", "colleague",
      "director", "assistant", "officer", "accountant", "senior staff", "salary", "wage", "pension", "bonus", "benefit"
    ],
    activity: [
      "demonstration", "thriller", "feedback", "discount", "prevention", "performance", "orchestra",
      "exhibition", "volleyball", "football", "tennis", "drama", "yoga", "rock climb", "hiking", "cycling",
      "emergency exit", "entrance", "special offer", "buffet", "cinema", "arcade", "historical interest"
    ],
    banking_shopping: [
      "currency", "refund", "expense", "saving", "bank statement", "transaction", "insurance", "cost", "interest rate",
      "loan", "cashier", "income", "voucher", "discount", "purchase", "bargain", "receipt", "wallet", "budget"
    ],
    medical: [
      "dietary problem", "stomachache", "flu", "scar", "headache", "cold", "allergic", "insomnia", "fever", "pain",
      "vaccine", "injection", "prescription", "antibiotics", "painkiller", "ambulance", "heart disease",
      "check-up", "fitness", "surgeon", "dentist", "physician", "patient", "clinic", "pharmacy", "treatment"
    ],
    education: [
      "enrolment", "assignment", "deadline", "presentation", "seminar", "lecture", "tutor", "professor",
      "research", "thesis", "dissertation", "degree", "diploma", "scholarship", "curriculum", "syllabus",
      "campus", "library", "laboratory", "semester", "term", "graduate", "undergraduate", "assessment"
    ],
    ecology: [
      "species", "creature", "climate", "environment", "temperature", "pollution", "recycling", "global warming",
      "natural resource", "habitat", "ecosystem", "wildlife", "conservation", "solar power", "energy",
      "waste", "rubbish", "carbon footprint", "drought", "flood", "disaster", "nature"
    ],
    technology: [
      "software", "hardware", "application", "device", "gadget", "internet", "connection", "network",
      "database", "security", "innovation", "artificial intelligence", "automation", "digital", "virtual",
      "screen", "keyboard", "battery", "technology", "modern", "convenient"
    ]
};

export const ALL_SCENE_WORDS = Object.values(SCENE_VOCABULARY).flat();
