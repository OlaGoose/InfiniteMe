'use client';

import { useState, useEffect, memo } from 'react';
import { X, BookMarked, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Flashcard } from '@/types';
import { getDueCards, getNewCards, getStudyStats } from '@/utils/anki';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onReview: (card: Flashcard, quality: number) => void;
  onClose: () => void;
}

function FlashcardDeck({ flashcards, onReview, onClose }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewMode, setReviewMode] = useState<'due' | 'new' | 'all'>('due');
  const [cardsToStudy, setCardsToStudy] = useState<Flashcard[]>([]);

  const stats = getStudyStats(flashcards);

  useEffect(() => {
    let cards: Flashcard[] = [];
    if (reviewMode === 'due') {
      cards = getDueCards(flashcards);
    } else if (reviewMode === 'new') {
      cards = getNewCards(flashcards);
    } else {
      cards = flashcards;
    }
    setCardsToStudy(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards, reviewMode]);

  const currentCard = cardsToStudy[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cardsToStudy.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleQualityClick = (quality: number) => {
    if (currentCard) {
      onReview(currentCard, quality);
      setIsFlipped(false);
      // Auto advance to next card
      if (currentIndex < cardsToStudy.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const getQualityLabel = (quality: number): string => {
    const labels = ['Again', 'Hard', 'Good', 'Easy'];
    const index = Math.floor((quality / 5) * 3);
    return labels[Math.min(index, 3)];
  };

  const getQualityColor = (quality: number): string => {
    if (quality <= 2) return 'bg-red-500 hover:bg-red-600';
    if (quality <= 3) return 'bg-orange-500 hover:bg-orange-600';
    if (quality <= 4) return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  if (cardsToStudy.length === 0) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-md h-[680px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookMarked className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600 mb-6">
              {reviewMode === 'due' ? 'No cards due for review.' : 'No new cards to study.'}
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 w-full">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.due}</div>
                  <div className="text-xs text-gray-500">Due</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.new}</div>
                  <div className="text-xs text-gray-500">New</div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md h-[680px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookMarked className="w-6 h-6" />
              <h2 className="text-xl font-bold">Flashcard Review</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setReviewMode('due')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                reviewMode === 'due' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              Due ({stats.due})
            </button>
            <button
              onClick={() => setReviewMode('new')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                reviewMode === 'new' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              New ({stats.new})
            </button>
            <button
              onClick={() => setReviewMode('all')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                reviewMode === 'all' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              All ({stats.total})
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span>{currentIndex + 1} / {cardsToStudy.length}</span>
            <div className="flex-1 mx-3 bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cardsToStudy.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div
            onClick={handleFlip}
            className="w-full aspect-[3/2] max-w-sm cursor-pointer perspective-1000"
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl border-2 border-blue-200 flex items-center justify-center p-8 backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                    {currentCard.type}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    {currentCard.front}
                  </div>
                  {currentCard.context && (
                    <div className="text-sm text-gray-600 italic mt-4 pt-4 border-t border-blue-200">
                      "{currentCard.context}"
                    </div>
                  )}
                  <div className="mt-6 text-xs text-gray-400 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Click to flip
                  </div>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl border-2 border-green-200 flex items-center justify-center p-8 backface-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">
                    Answer
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    {currentCard.back}
                  </div>
                  <div className="mt-6 text-xs text-gray-400 flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Click to flip back
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Card {currentIndex + 1}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === cardsToStudy.length - 1}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Quality Buttons (always occupy space for fixed height) */}
        <div className="p-6 pt-0">
          <div
            className={`transition-opacity duration-300 ${
              isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-4 gap-2">
              {[0, 2, 4, 5].map((quality, idx) => (
                <button
                  key={quality}
                  onClick={() => handleQualityClick(quality)}
                  disabled={!isFlipped}
                  className={`py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${getQualityColor(quality)}`}
                >
                  {getQualityLabel(quality)}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 text-center mt-3">
              Rate how well you remembered this card
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}

export default memo(FlashcardDeck);
