import { supabase } from './client';
import { UserStats, Checkpoint, Flashcard, EventRecord } from '@/types';
import { CHECKPOINTS, INITIAL_LOCATION } from '@/constants';

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Try to get from localStorage or generate a persistent ID
  try {
    let userId = localStorage.getItem('step_trek_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('step_trek_user_id', userId);
    }
    return userId;
  } catch (error) {
    console.warn('Failed to access localStorage:', error);
    return null;
  }
};

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

export const storageService = {
  async getStats(): Promise<UserStats> {
    const userId = getUserId();
    if (!userId) {
      // Return initial stats if not in browser environment
      return { ...INITIAL_STATS };
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      // Return initial stats if Supabase not configured
      return { ...INITIAL_STATS };
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Check if it's a "not found" error (PGRST116)
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          // Create initial stats if not exists
          const initialStats = { ...INITIAL_STATS };
          await this.saveStats(initialStats);
          return initialStats;
        }
        // For other errors, log and return initial stats
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

  async saveStats(stats: UserStats): Promise<void> {
    const userId = getUserId();
    if (!userId) {
      // Silently fail if not in browser environment
      return;
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
      }
    } catch (error) {
      console.warn('Unexpected error in saveStats:', error);
    }
  },

  async getCheckpoints(): Promise<Checkpoint[]> {
    const userId = getUserId();
    if (!userId) {
      // Return default checkpoints if not in browser environment
      return CHECKPOINTS.map(cp => ({
        ...cp,
        isUnlocked: true,
        isCompleted: false,
      }));
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      // Return default checkpoints if Supabase not configured
      return CHECKPOINTS.map(cp => ({
        ...cp,
        isUnlocked: true,
        isCompleted: false,
      }));
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
        const initialCheckpoints = CHECKPOINTS.map(cp => ({
          ...cp,
          isUnlocked: true,
          isCompleted: false,
        }));
        await this.saveCheckpoints(initialCheckpoints);
        return initialCheckpoints;
      }

      if (!data || data.length === 0) {
        // Initialize with default checkpoints
        const initialCheckpoints = CHECKPOINTS.map(cp => ({
          ...cp,
          isUnlocked: true,
          isCompleted: false,
        }));
        await this.saveCheckpoints(initialCheckpoints);
        return initialCheckpoints;
      }

      return data.map((cp: any) => ({
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
      }));
    } catch (error) {
      console.warn('Unexpected error in getCheckpoints:', error);
      return CHECKPOINTS.map(cp => ({
        ...cp,
        isUnlocked: true,
        isCompleted: false,
      }));
    }
  },

  async saveCheckpoints(checkpoints: Checkpoint[]): Promise<void> {
    const userId = getUserId();
    if (!userId) {
      // Silently fail if not in browser environment
      return;
    }

    try {
      const checkpointsToSave = checkpoints.map(cp => ({
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
      }));

      // Use upsert to safely update or insert checkpoints
      // onConflict: id (primary key) - update if exists, insert if not
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
      }
    } catch (error) {
      console.warn('Unexpected error in saveCheckpoints:', error);
    }
  },

  async getFlashcards(): Promise<Flashcard[]> {
    const userId = getUserId();
    if (!userId) {
      // Return empty array if not in browser environment
      return [];
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      // Return empty array if Supabase not configured
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

  async saveFlashcards(flashcards: Flashcard[]): Promise<void> {
    const userId = getUserId();
    if (!userId) {
      // Silently fail if not in browser environment
      return;
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

      // Use upsert to safely update or insert flashcards
      // onConflict: id (primary key) - update if exists, insert if not
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
      }
    } catch (error) {
      console.warn('Unexpected error in saveFlashcards:', error);
    }
  },

  async getHistory(): Promise<EventRecord[]> {
    const userId = getUserId();
    if (!userId) {
      // Return empty array if not in browser environment
      return [];
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      // Return empty array if Supabase not configured
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

  async addHistoryItem(item: EventRecord): Promise<void> {
    const userId = getUserId();
    if (!userId) {
      // Silently fail if not in browser environment
      return;
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
      }
    } catch (error) {
      console.warn('Unexpected error in addHistoryItem:', error);
    }
  },
};
