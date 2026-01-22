/**
 * Supabase Storage Service
 * 
 * Centralized service for all database operations including:
 * - User stats management
 * - Checkpoints CRUD operations
 * - Flashcards management with Anki SM-2 algorithm support
 * - Event history tracking
 * 
 * Features:
 * - Automatic fallback to local defaults when Supabase is not configured
 * - Graceful error handling with detailed logging
 * - Type-safe database operations
 * - Optimized batch operations
 */

import { supabase } from './client';
import { UserStats, Checkpoint, Flashcard, EventRecord } from '@/types';
import { CHECKPOINTS, INITIAL_LOCATION } from '@/constants';

// Constants
const USER_ID_KEY = 'step_trek_user_id';
const NOT_FOUND_ERROR_CODE = 'PGRST116';

const INITIAL_STATS: UserStats = {
  totalSteps: 5000,
  availableSteps: 5000,
  traveledDistance: 0,
  completedDialogues: 0,
  learnedWords: 0,
  currentLocation: INITIAL_LOCATION,
  avatarImage: undefined,
  inventory: [],
};

/**
 * Get or create a persistent user ID from localStorage
 * @returns User ID string or null if not in browser environment
 */
const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      // Generate a unique user ID
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.warn('Failed to access localStorage:', error);
    return null;
  }
};

/**
 * Check if Supabase is properly configured
 * @returns true if Supabase URL is configured
 */
const isSupabaseConfigured = (): boolean => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(supabaseUrl && supabaseUrl !== '');
};

/**
 * Transform database checkpoint to application checkpoint format
 */
const transformCheckpointFromDb = (cp: any): Checkpoint => ({
  id: cp.id,
  name: cp.name,
  type: cp.type as Checkpoint['type'],
  location: cp.location as { lat: number; lng: number },
  difficulty: cp.difficulty as Checkpoint['difficulty'],
  scenario: cp.scenario,
  npcRole: cp.npc_role,
  dialogPrompt: cp.dialog_prompt,
  image: cp.image,
  customMarkerImage: cp.custom_marker_image || undefined,
  isUnlocked: cp.is_unlocked,
  isCompleted: cp.is_completed,
  challengeConfig: cp.challenge_config || undefined,
  shopConfig: cp.shop_config || undefined,
});

/**
 * Transform application checkpoint to database format
 */
const transformCheckpointToDb = (cp: Checkpoint, userId: string) => ({
  id: cp.id,
  user_id: userId,
  name: cp.name,
  type: cp.type || 'chat',
  location: cp.location,
  difficulty: cp.difficulty,
  scenario: cp.scenario,
  npc_role: cp.npcRole,
  dialog_prompt: cp.dialogPrompt,
  image: cp.image,
  custom_marker_image: cp.customMarkerImage || null,
  is_unlocked: cp.isUnlocked,
  is_completed: cp.isCompleted,
  challenge_config: cp.challengeConfig || null,
  shop_config: cp.shopConfig || null,
});

/**
 * Get default checkpoints with unlocked and completed flags
 */
const getDefaultCheckpoints = (): Checkpoint[] => {
  return CHECKPOINTS.map(cp => ({
    ...cp,
    isUnlocked: true,
    isCompleted: false,
  }));
};

/**
 * Storage service for all database operations
 */
export const storageService = {
  // ==================== User Stats ====================
  
  /**
   * Get user statistics
   * Creates initial stats if user doesn't exist
   */
  async getStats(): Promise<UserStats> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return { ...INITIAL_STATS };
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Create initial stats if user doesn't exist
        if (error.code === NOT_FOUND_ERROR_CODE || error.message?.includes('No rows')) {
          const initialStats = { ...INITIAL_STATS };
          await this.saveStats(initialStats);
          return initialStats;
        }
        
        console.warn('Error fetching stats:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return { ...INITIAL_STATS };
      }

      if (!data) {
        const initialStats = { ...INITIAL_STATS };
        await this.saveStats(initialStats);
        return initialStats;
      }

      return {
        totalSteps: data.total_steps,
        availableSteps: data.available_steps,
        traveledDistance: data.traveled_distance,
        completedDialogues: data.completed_dialogues,
        learnedWords: data.learned_words,
        currentLocation: data.current_location as { lat: number; lng: number },
        avatarImage: data.avatar_image || undefined,
        inventory: data.inventory || [],
      };
    } catch (error) {
      console.warn('Unexpected error in getStats:', error);
      return { ...INITIAL_STATS };
    }
  },

  /**
   * Save user statistics
   * Uses upsert to create or update user stats
   */
  async saveStats(stats: UserStats): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          total_steps: stats.totalSteps,
          available_steps: stats.availableSteps,
          traveled_distance: stats.traveledDistance,
          completed_dialogues: stats.completedDialogues,
          learned_words: stats.learnedWords,
          current_location: stats.currentLocation,
          avatar_image: stats.avatarImage || null,
          inventory: stats.inventory,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.warn('Error saving stats:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Unexpected error in saveStats:', error);
      return false;
    }
  },

  // ==================== Checkpoints ====================

  /**
   * Get all checkpoints for the current user
   * Initializes with default checkpoints if none exist
   */
  async getCheckpoints(): Promise<Checkpoint[]> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return getDefaultCheckpoints();
    }

    try {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching checkpoints:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        // Initialize with default checkpoints
        const initialCheckpoints = getDefaultCheckpoints();
        await this.saveCheckpoints(initialCheckpoints);
        return initialCheckpoints;
      }

      if (!data || data.length === 0) {
        // Initialize with default checkpoints
        const initialCheckpoints = getDefaultCheckpoints();
        await this.saveCheckpoints(initialCheckpoints);
        return initialCheckpoints;
      }

      return data.map(transformCheckpointFromDb);
    } catch (error) {
      console.warn('Unexpected error in getCheckpoints:', error);
      return getDefaultCheckpoints();
    }
  },

  /**
   * Save multiple checkpoints (batch operation)
   * More efficient for saving all checkpoints at once
   */
  async saveCheckpoints(checkpoints: Checkpoint[]): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const checkpointsToSave = checkpoints.map(cp => transformCheckpointToDb(cp, userId));

      const { error } = await supabase
        .from('checkpoints')
        .upsert(checkpointsToSave, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn('Error saving checkpoints:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Unexpected error in saveCheckpoints:', error);
      return false;
    }
  },

  /**
   * Add or update a single checkpoint
   * More efficient than saveCheckpoints when only one checkpoint changes
   */
  async upsertCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const checkpointData = transformCheckpointToDb(checkpoint, userId);

      const { error } = await supabase
        .from('checkpoints')
        .upsert(checkpointData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error upserting checkpoint:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in upsertCheckpoint:', error);
      return false;
    }
  },

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('checkpoints')
        .delete()
        .eq('id', checkpointId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting checkpoint:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in deleteCheckpoint:', error);
      return false;
    }
  },

  // ==================== Flashcards ====================

  /**
   * Get all flashcards for the current user
   */
  async getFlashcards(): Promise<Flashcard[]> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching flashcards:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return [];
      }

      return (data || []).map((fc: any) => ({
        id: fc.id,
        type: fc.type as Flashcard['type'],
        front: fc.front,
        back: fc.back,
        context: fc.context || undefined,
        createdAt: new Date(fc.created_at).getTime(),
        reviewCount: fc.review_count || 0,
        easeFactor: fc.ease_factor || 2.5,
        interval: fc.interval || 0,
        nextReviewDate: fc.next_review_date || Date.now(),
        lastReviewDate: fc.last_review_date || undefined,
        quality: fc.quality || undefined,
      }));
    } catch (error) {
      console.warn('Unexpected error in getFlashcards:', error);
      return [];
    }
  },

  /**
   * Save multiple flashcards (batch operation)
   */
  async saveFlashcards(flashcards: Flashcard[]): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const flashcardsToSave = flashcards.map(fc => ({
        id: fc.id,
        user_id: userId,
        type: fc.type,
        front: fc.front,
        back: fc.back,
        context: fc.context || null,
        review_count: fc.reviewCount,
        ease_factor: fc.easeFactor,
        interval: fc.interval,
        next_review_date: fc.nextReviewDate,
        last_review_date: fc.lastReviewDate || null,
        quality: fc.quality || null,
      }));

      const { error } = await supabase
        .from('flashcards')
        .upsert(flashcardsToSave, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn('Error saving flashcards:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Unexpected error in saveFlashcards:', error);
      return false;
    }
  },

  // ==================== Event History ====================

  /**
   * Get event history for the current user
   * Returns the most recent 50 events
   */
  async getHistory(): Promise<EventRecord[]> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('event_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Error fetching history:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return [];
      }

      return (data || []).map((eh: any) => ({
        id: eh.id,
        checkpointId: eh.checkpoint_id,
        checkpointName: eh.checkpoint_name,
        checkpointImage: eh.checkpoint_image,
        npcRole: eh.npc_role,
        type: eh.type as EventRecord['type'],
        timestamp: eh.timestamp,
        messages: eh.messages as EventRecord['messages'],
        challengeResult: eh.challenge_result || undefined,
      }));
    } catch (error) {
      console.warn('Unexpected error in getHistory:', error);
      return [];
    }
  },

  /**
   * Add a new event history item
   */
  async addHistoryItem(item: EventRecord): Promise<boolean> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('event_history')
        .insert({
          user_id: userId,
          checkpoint_id: item.checkpointId,
          checkpoint_name: item.checkpointName,
          checkpoint_image: item.checkpointImage,
          npc_role: item.npcRole,
          type: item.type,
          messages: item.messages,
          challenge_result: item.challengeResult || null,
          timestamp: item.timestamp,
        });

      if (error) {
        console.warn('Error saving history item:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Unexpected error in addHistoryItem:', error);
      return false;
    }
  },
};
