import { Checkpoint, LatLng, MapStyle, DifficultyLevel, WeatherType, ShopItem } from '@/types';

export const METERS_PER_STEP = 0.7;
export const INTERACTION_RADIUS_METERS = 150;

export const WEATHER_CONFIG: {
  duration: number;
  penaltyInterval: number;
  penaltyAmount: number;
  cycleDuration: number;
  types: Record<WeatherType, {
    label: string;
    icon: string;
    requiredItem?: string;
    penaltyMsg?: string;
    bgClass: string;
  }>;
} = {
  duration: 60,
  penaltyInterval: 10000,
  penaltyAmount: 10,
  cycleDuration: 180,
  types: {
    sunny: {
      label: 'Sunny',
      icon: 'Sun',
      bgClass: '',
    },
    rain: {
      label: 'Raining',
      icon: 'CloudRain',
      requiredItem: 'umbrella',
      penaltyMsg: 'Getting wet! (-10 pts)',
      bgClass: 'animate-weather-rain',
    },
    storm: {
      label: 'Storm',
      icon: 'CloudLightning',
      requiredItem: 'raincoat',
      penaltyMsg: 'Strong winds! (-10 pts)',
      bgClass: 'animate-weather-storm',
    },
    snow: {
      label: 'Snowing',
      icon: 'Snowflake',
      requiredItem: 'jacket',
      penaltyMsg: 'Freezing! (-10 pts)',
      bgClass: 'animate-weather-snow',
    },
    heatwave: {
      label: 'Heatwave',
      icon: 'Flame',
      requiredItem: 'water',
      penaltyMsg: 'Dehydrated! (-10 pts)',
      bgClass: 'animate-weather-heat',
    },
  },
};

export const INITIAL_LOCATION: LatLng = { lat: 51.5080, lng: -0.1281 };

export const MAP_STYLES: Record<MapStyle, { name: string; url: string; attribution: string }> = {
  light: {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

interface DifficultyConfig {
  label: string;
  cefr: string;
  description: string;
  aiInstruction: string;
  colors: {
    text: string;
    bg: string;
    dot: string;
    border: string;
  };
}

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  basic: {
    label: 'Foundation',
    cefr: 'A1',
    description: 'Survival English. Simple words, slow pace.',
    aiInstruction: `CRITICAL - STRICT LEVEL A1 (Basic/Foundation):
- Vocabulary: Use ONLY the most common 500 words (e.g., I, you, is, have, go, want, this, that)
- Grammar: ONLY Present Simple ("I go") and Present Continuous ("I am going"). NO past tense, NO future forms except "will"
- Sentence Structure: Maximum 5-7 words per sentence. Use simple Subject-Verb-Object pattern
- NO idioms, NO phrasal verbs, NO complex words
- Speak slowly and clearly like teaching a child
- Examples: "Hello. How are you?" / "I want coffee." / "This is nice." / "Where is it?"`,
    colors: {
      text: 'text-sky-600',
      bg: 'bg-sky-50',
      dot: 'bg-sky-500',
      border: 'border-sky-100',
    },
  },
  beginner: {
    label: 'Waystage',
    cefr: 'A2',
    description: 'Routine tasks. Past tense & simple future.',
    aiInstruction: `CRITICAL - STRICT LEVEL A2 (Beginner/Waystage):
- Vocabulary: Use common 1000-1500 words (daily activities, family, food, work, travel)
- Grammar: Present Simple/Continuous, Past Simple ("I went"), "going to" future ("I'm going to...")
- Sentence Structure: 8-12 words max. Use simple connectors: and, but, because, so
- Limited phrasal verbs (common ones only: wake up, get up, go out)
- Clear, direct communication. Speak at moderate pace
- Examples: "I went to the park yesterday." / "I'm going to buy this because it's cheap." / "What did you do last weekend?"`,
    colors: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      dot: 'bg-green-500',
      border: 'border-green-100',
    },
  },
  intermediate: {
    label: 'Threshold',
    cefr: 'B1/B2',
    description: 'Conversational. Opinions & explanations.',
    aiInstruction: `LEVEL B1/B2 (Intermediate/Threshold):
- Vocabulary: 3000+ words including abstract concepts (opinion, experience, possibility, advantage)
- Grammar: All tenses including Present Perfect, Past Perfect, Conditionals (if/would), Passive voice
- Sentence Structure: Complex sentences with multiple clauses. Natural linking words (however, although, despite)
- Common idioms allowed (piece of cake, under the weather, break the ice)
- Natural conversation speed with some nuance
- Express opinions, give explanations, describe experiences
- Examples: "If I were you, I'd try the new restaurant." / "Having lived here for years, I can recommend..." / "Despite the weather, it's worth visiting."`,
    colors: {
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      dot: 'bg-yellow-500',
      border: 'border-yellow-100',
    },
  },
  advanced: {
    label: 'Mastery',
    cefr: 'C1/C2',
    description: 'Fluent. Complex grammar & nuance.',
    aiInstruction: `LEVEL C1/C2 (Advanced/Mastery):
- Vocabulary: Native-level vocabulary including sophisticated words, academic terms, cultural references
- Grammar: All advanced structures - complex conditionals, subjunctive, inversion, ellipsis
- Sentence Structure: Long, sophisticated sentences with embedded clauses and natural flow
- Extensive use of idioms, phrasal verbs, colloquialisms, wordplay
- Cultural references, subtle humor, implicit meaning
- Fast, natural pace with rhythm and intonation implied
- Examples: "Were it not for the unforeseen circumstances..." / "The implications, as you might well imagine, are far-reaching." / "It's not exactly rocket science, but..."`,
    colors: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      dot: 'bg-red-500',
      border: 'border-red-100',
    },
  },
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'umbrella',
    name: 'Umbrella',
    description: 'Essential for London rain.',
    price: 500,
    icon: 'Umbrella',
    requiredFor: 'rain',
  },
  {
    id: 'raincoat',
    name: 'Raincoat',
    description: 'Heavy duty protection for storms.',
    price: 800,
    icon: 'CloudLightning',
    requiredFor: 'storm',
  },
  {
    id: 'jacket',
    name: 'Warm Jacket',
    description: 'Keeps you warm in snow.',
    price: 1000,
    icon: 'Snowflake',
    requiredFor: 'snow',
  },
  {
    id: 'water',
    name: 'Ice Water',
    description: 'Stay hydrated in heatwaves.',
    price: 300,
    icon: 'Flame',
    requiredFor: 'heatwave',
  },
];

export const CHECKPOINTS: Omit<Checkpoint, 'isUnlocked' | 'isCompleted'>[] = [
  {
    id: 'oxford-street-shop',
    name: 'Oxford Street Shop',
    type: 'shop',
    location: { lat: 51.5142, lng: -0.1367 },
    difficulty: 'intermediate',
    scenario: 'Buying supplies',
    npcRole: 'Shopkeeper Tom',
    dialogPrompt: 'You are a shopkeeper. The user wants to buy weather supplies. You can offer a 50% discount if they ask nicely and chat with you for a while.',
    image: 'https://picsum.photos/id/1059/400/300',
    shopConfig: {
      items: SHOP_ITEMS,
    },
  },
  {
    id: 'big-ben',
    name: 'Big Ben',
    type: 'chat',
    location: { lat: 51.5007, lng: -0.1246 },
    difficulty: 'basic',
    scenario: 'Asking for time',
    npcRole: 'The Timekeeper',
    dialogPrompt: 'Greet the traveler warmly. Briefly mention the clock. Ask if they want to know the time.',
    image: 'https://picsum.photos/id/1040/400/300',
  },
  {
    id: 'london-eye',
    name: 'London Eye',
    type: 'chat',
    location: { lat: 51.5033, lng: -0.1195 },
    difficulty: 'intermediate',
    scenario: 'Buying a ticket',
    npcRole: 'Ticket Seller Sarah',
    dialogPrompt: 'You are selling tickets. Explain the view from the top is 135 meters high. Ask how many tickets they need.',
    image: 'https://picsum.photos/id/1047/400/300',
  },
  {
    id: 'buckingham-palace',
    name: 'Buckingham Palace',
    type: 'chat',
    location: { lat: 51.5014, lng: -0.1419 },
    difficulty: 'advanced',
    scenario: 'Royal Guard interaction',
    npcRole: 'Guard Henry',
    dialogPrompt: 'You are a stoic guard but polite. Explain you cannot move. Mention the Changing of the Guard ceremony.',
    image: 'https://picsum.photos/id/1039/400/300',
  },
  {
    id: 'tower-bridge',
    name: 'Tower Bridge',
    type: 'chat',
    location: { lat: 51.5055, lng: -0.0754 },
    difficulty: 'intermediate',
    scenario: 'Watching the bridge lift',
    npcRole: 'Engineer George',
    dialogPrompt: 'Explain how the bridge lifts for ships. Ask if they like engineering.',
    image: 'https://picsum.photos/id/1028/400/300',
  },
  {
    id: 'job-interview',
    name: 'Tech Startup HQ',
    type: 'challenge',
    location: { lat: 51.5090, lng: -0.1260 },
    difficulty: 'advanced',
    scenario: 'Job Interview',
    npcRole: 'Interviewer Ms. Sharp',
    dialogPrompt: 'You are a strict but fair interviewer at a tech company. Ask the candidate about their strengths, weaknesses, and why they want this job. Keep the tone professional.',
    image: 'https://picsum.photos/id/1/400/300',
    challengeConfig: {
      maxTurns: 5,
      targetScore: 80,
      winReward: 100,
      losePenalty: 100,
      goalDescription: 'Impress Ms. Sharp and get the job offer.',
    },
  },
];
