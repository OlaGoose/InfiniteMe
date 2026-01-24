export interface LatLng {
  lat: number;
  lng: number;
}

export type MapStyle = 'light' | 'dark' | 'satellite';

export type CheckpointType = 'chat' | 'challenge' | 'shop' | 'youtube-learning';

// Learning stages for structured learning flow
export type LearningStage = 
  | 'welcome'           // 1. Welcome & scenario introduction with media
  | 'vocabulary'        // 2. Vocabulary preview with images and audio
  | 'listening'         // 3. Listening comprehension practice
  | 'pronunciation'     // 4. Pronunciation practice with speech recognition
  | 'pattern'          // 5. Sentence pattern practice (fill-in-blanks, multiple choice)
  | 'guided'           // 6. Guided conversation with scaffolding
  | 'free'             // 7. Free conversation practice
  | 'review'           // 8. Review and reward
  | 'completed';       // 9. Stage completed

export interface VocabularyItem {
  word: string;
  translation: string;
  phonetic?: string;
  audioUrl?: string;
  imageUrl?: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface PatternPractice {
  id: string;
  type: 'fill-blank' | 'multiple-choice' | 'arrange-words';
  question: string;
  correctAnswer: string;
  options?: string[];  // For multiple choice
  words?: string[];    // For arrange words
  hint?: string;
}

export interface ListeningExercise {
  id: string;
  audioText: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface PronunciationExercise {
  id: string;
  targetSentence: string;
  translation: string;
  audioUrl?: string;
  minimumScore: number; // 0-100
}

export interface LearningProgress {
  checkpointId: string;
  currentStage: LearningStage;
  stageProgress: {
    welcome: boolean;
    vocabulary: number;        // 0-100%
    listening: number;         // 0-100%
    pronunciation: number;     // 0-100%
    pattern: number;           // 0-100%
    guided: number;            // 0-100%
    free: number;              // 0-100%
    review: boolean;
  };
  vocabularyMastery: { [word: string]: number }; // 0-100 per word
  overallScore: number;      // 0-100
  completedAt?: number;
  earnedSteps: number;
}

export type DifficultyLevel = 'basic' | 'beginner' | 'intermediate' | 'advanced';

export type WeatherType = 'sunny' | 'rain' | 'storm' | 'snow' | 'heatwave';

// ========== Game Mode System ==========
export type GameMode = 'story' | 'exploration';

export type StoryId = 'london-journey' | 'friends-s01e01';

export interface Story {
  id: StoryId;
  name: string;
  description: string;
  icon: string;
  thumbnail: string;
  totalCheckpoints: number;
  estimatedDuration: string; // e.g., "2-3 hours"
  difficulty: DifficultyLevel;
  tags: string[]; // e.g., ['travel', 'culture'], ['sitcom', 'friendship']
  checkpoints: Omit<Checkpoint, 'isUnlocked' | 'isCompleted'>[];
}

// Media content types for checkpoint introduction
export type MediaType = 'video' | 'audio' | 'images' | 'text' | 'youtube';

export interface MediaContent {
  type: MediaType;
  url?: string; // OSS URL for video/audio/text file
  urls?: string[]; // OSS URLs for image carousel
  youtubeId?: string; // YouTube video ID
  title?: string;
  description?: string;
  duration?: number; // Duration in seconds (for video/audio)
  autoPlay?: boolean; // Auto play media
}

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
  // Media introduction before dialog
  mediaIntro?: MediaContent;
  // Story mode fields
  storyId?: StoryId; // Which story this checkpoint belongs to (undefined for exploration mode)
  order?: number; // Order in the story (for linear unlocking)
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
  cefrLevel?: CEFRLevel; // User's English level for YouTube learning
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

// ========== YouTube Learning System ==========
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VideoSegment {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds (15-45)
  transcript: string;
  subtitle: string;
  cefrLevel: CEFRLevel;
  difficultyScore: number; // 0-100
  vocabularyComplexity: number; // 0-100
  speechRate: number; // words per minute
  sentenceComplexity: number; // 0-100 (based on clauses, tenses)
  pronunciationClarity: number; // 0-100
  topics: string[]; // extracted topics
  keywords: string[]; // key vocabulary
}

export interface YouTubeVideoAnalysis {
  videoId: string;
  videoUrl: string;
  title: string;
  description: string;
  duration: number; // total duration in seconds
  segments: VideoSegment[];
  hasSubtitles: boolean;
  analyzedAt: number; // timestamp
}

export interface UserLearningProfile {
  cefrLevel: CEFRLevel;
  preferredTopics: string[]; // from voice input analysis
  learningPath: 'daily' | 'workplace' | 'interest'; // daily高频 → workplace职场 → interest兴趣
  recentSegments: string[]; // segment IDs
}

export interface RecommendedSegment extends VideoSegment {
  relevanceScore: number; // 0-100 (topic match)
  difficultyMatch: number; // 0-100 (how well it matches user level)
  freshnessScore: number; // 0-100 (how new this is to user)
  overallScore: number; // weighted: relevance 60% + difficulty 30% + freshness 10%
}

export interface ShadowReadingSession {
  segmentId: string;
  playbackSpeed: 0.75 | 1.0 | 1.25;
  isLooping: boolean;
  currentPlayCount: number;
  userRecording?: {
    audioUrl: string;
    similarityScore?: number; // 0-100
    recordedAt: number;
  };
}

export interface YouTubeLearningCheckpoint extends Omit<Checkpoint, 'type'> {
  type: 'youtube-learning';
  youtubeConfig?: {
    videoUrl?: string; // user can input
    defaultVideoId?: string; // pre-configured
    userLevel?: CEFRLevel; // from user stats or input
    autoAnalyze?: boolean; // auto analyze on open
  };
}
