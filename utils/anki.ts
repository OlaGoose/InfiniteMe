/**
 * Anki SM-2 Spaced Repetition Algorithm
 * 
 * Based on SuperMemo SM-2 algorithm
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import { Flashcard } from '@/types';

export interface ReviewResult {
  easeFactor: number;
  interval: number;
  nextReviewDate: number;
  lastReviewDate: number;
}

/**
 * Calculate next review based on SM-2 algorithm
 * 
 * @param card - Current flashcard
 * @param quality - User's answer quality (0-5)
 *   0: Complete blackout
 *   1: Incorrect, but familiar
 *   2: Incorrect, but easy to recall
 *   3: Correct, but difficult
 *   4: Correct, with hesitation
 *   5: Perfect recall
 * @returns Updated review parameters
 */
export function calculateNextReview(
  card: Flashcard,
  quality: number
): ReviewResult {
  const now = Date.now();
  let { easeFactor, interval } = card;

  // Quality must be 0-5
  quality = Math.max(0, Math.min(5, quality));

  // Calculate new ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate new interval
  if (quality < 3) {
    // Failed - restart from beginning
    interval = 0;
  } else {
    // Passed
    if (interval === 0) {
      interval = 1; // First review: 1 day
    } else if (interval === 1) {
      interval = 6; // Second review: 6 days
    } else {
      // Subsequent reviews: multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = now + interval * 24 * 60 * 60 * 1000;

  return {
    easeFactor,
    interval,
    nextReviewDate,
    lastReviewDate: now,
  };
}

/**
 * Get cards due for review
 */
export function getDueCards(cards: Flashcard[]): Flashcard[] {
  const now = Date.now();
  return cards.filter(card => card.nextReviewDate <= now);
}

/**
 * Get new cards (never reviewed)
 */
export function getNewCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter(card => card.reviewCount === 0);
}

/**
 * Sort cards by priority (due date)
 */
export function sortByPriority(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

/**
 * Get study statistics
 */
export function getStudyStats(cards: Flashcard[]) {
  const now = Date.now();
  const dueCards = cards.filter(card => card.nextReviewDate <= now);
  const newCards = cards.filter(card => card.reviewCount === 0);
  const learnedCards = cards.filter(card => card.reviewCount > 0);

  return {
    total: cards.length,
    due: dueCards.length,
    new: newCards.length,
    learned: learnedCards.length,
  };
}
