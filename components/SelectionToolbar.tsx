'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Languages, BookMarked, Loader2, X } from 'lucide-react';

interface SelectionToolbarProps {
  x: number;
  y: number;
  selectedText: string;
  onTranslate: (text: string) => Promise<string>;
  onAddToFlashcard: (word: string, translation: string) => void;
  onClose: () => void;
}

function SelectionToolbar({
  x,
  y,
  selectedText,
  onTranslate,
  onAddToFlashcard,
  onClose,
}: SelectionToolbarProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Auto-translate on mount for better UX
  useEffect(() => {
    handleTranslate();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await onTranslate(selectedText);
      setTranslation(result);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslation('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddToFlashcard = () => {
    if (translation && translation !== 'Translation failed') {
      onAddToFlashcard(selectedText, translation);
      onClose();
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] animate-in fade-in slide-in-from-bottom-1 duration-150"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[280px] max-w-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">{selectedText}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {isTranslating ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-600">Translating...</span>
            </div>
          ) : translation ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {translation}
                </p>
              </div>
              <button
                onClick={handleAddToFlashcard}
                disabled={translation === 'Translation failed'}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-purple-600 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <BookMarked className="w-4 h-4" />
                Add to Flashcards
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Arrow */}
      <div
        className="absolute left-1/2 -bottom-1 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid white',
        }}
      />
    </div>
  );
}

export default memo(SelectionToolbar);
