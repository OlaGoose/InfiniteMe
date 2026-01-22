import { LatLng, MapStyle, DifficultyLevel, WeatherType } from '@/types';
export { STORIES, CHECKPOINTS } from './stories';

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

// 📚 关卡设计理念：
// 1. 故事线：旅行者初到伦敦的完整旅程
// 2. 渐进式难度：A1(2) → A2(2) → B1(2) → B2(2) → C1(1) → C2(1)
// 3. 真实场景：覆盖旅行者实际会遇到的生活场景
// 4. 鲜明人设：每个NPC有独特性格和背景故事
// 5. 学习目标：每个关卡对应具体的语言学习点

// Note: CHECKPOINTS and STORIES are now exported from './stories.ts'
// All checkpoint definitions have been moved to constants/stories.ts
