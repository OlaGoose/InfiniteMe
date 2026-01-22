export interface LatLng {
  lat: number;
  lng: number;
}

export type MapStyle = 'light' | 'dark' | 'satellite';

export type CheckpointType = 'chat' | 'challenge' | 'shop';

export type DifficultyLevel = 'basic' | 'beginner' | 'intermediate' | 'advanced';

export type WeatherType = 'sunny' | 'rain' | 'storm' | 'snow' | 'heatwave';

export interface Checkpoint {
  id: string;
  name: string;
  type?: CheckpointType;
  location: LatLng;
  difficulty: DifficultyLevel;
  scenario: string;
  npcRole: string;
  dialogPrompt: string;
  image: string;
  customMarkerImage?: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  challengeConfig?: {
    maxTurns: number;
    targetScore: number;
    winReward: number;
    losePenalty: number;
    goalDescription: string;
  };
  shopConfig?: {
    items: ShopItem[];
  };
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  requiredFor?: WeatherType;
}

export interface UserStats {
  totalSteps: number;
  availableSteps: number;
  traveledDistance: number;
  completedDialogues: number;
  learnedWords: number;
  currentLocation: LatLng;
  avatarImage?: string;
  inventory: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  options?: string[];
  timestamp: number;
  translation?: string;
  optimization?: string;
  grammarCorrection?: {
    corrected: string;
    explanation: string;
  };
}

export interface EventRecord {
  id: string;
  checkpointId: string;
  checkpointName: string;
  checkpointImage: string;
  npcRole: string;
  type: CheckpointType;
  timestamp: number;
  messages: ChatMessage[];
  challengeResult?: {
    score: number;
    success: boolean;
  };
}

export interface Flashcard {
  id: string;
  type: 'vocabulary' | 'grammar';
  front: string;
  back: string;
  context?: string;
  createdAt: number;
  reviewCount: number;
  // Anki SM-2 Algorithm fields
  easeFactor: number; // 难度系数，默认 2.5
  interval: number; // 复习间隔（天数）
  nextReviewDate: number; // 下次复习时间戳
  lastReviewDate?: number; // 上次复习时间戳
  quality?: number; // 上次回答质量 (0-5)
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}
