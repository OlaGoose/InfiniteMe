/**
 * Helper functions for adding/updating single checkpoints
 * More efficient than saving all checkpoints at once
 */

import { supabase } from './client';
import { Checkpoint } from '@/types';

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('step_trek_user_id');
  } catch (error) {
    console.warn('Failed to access localStorage:', error);
    return null;
  }
};

/**
 * Add or update a single checkpoint
 * More efficient than saveCheckpoints when only one checkpoint changes
 */
export async function upsertCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
  const userId = getUserId();
  if (!userId) {
    console.warn('Cannot save checkpoint: no user ID');
    return false;
  }

  try {
    const checkpointData = {
      id: checkpoint.id,
      user_id: userId,
      name: checkpoint.name,
      type: checkpoint.type || 'chat',
      location: checkpoint.location,
      difficulty: checkpoint.difficulty,
      scenario: checkpoint.scenario,
      npc_role: checkpoint.npcRole,
      dialog_prompt: checkpoint.dialogPrompt,
      image: checkpoint.image,
      custom_marker_image: checkpoint.customMarkerImage || null,
      is_unlocked: checkpoint.isUnlocked,
      is_completed: checkpoint.isCompleted,
      challenge_config: checkpoint.challengeConfig || null,
      shop_config: checkpoint.shopConfig || null,
    };

    const { error } = await supabase
      .from('checkpoints')
      .upsert(checkpointData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error upserting checkpoint:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in upsertCheckpoint:', error);
    return false;
  }
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(checkpointId: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) {
    console.warn('Cannot delete checkpoint: no user ID');
    return false;
  }

  try {
    const { error } = await supabase
      .from('checkpoints')
      .delete()
      .eq('id', checkpointId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting checkpoint:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in deleteCheckpoint:', error);
    return false;
  }
}
