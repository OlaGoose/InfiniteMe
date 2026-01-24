'use client';

import { useState, useEffect, useRef } from 'react';
import { MediaContent } from '@/types';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MediaIntroProps {
  media: MediaContent;
  onClose: () => void;
  onComplete?: () => void;
}

// Detect mobile device
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
};

export default function MediaIntro({ media, onClose, onComplete }: MediaIntroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(media.autoPlay !== false);
  // On mobile, start muted to enable autoplay
  const [isMuted, setIsMuted] = useState(isMobileDevice());
  const [hasInteracted, setHasInteracted] = useState(false);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Auto-complete for text content after 5 seconds if user hasn't interacted
    if (media.type === 'text') {
      const timer = setTimeout(() => {
        if (!hasInteracted && onComplete) {
          onComplete();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [media.type, hasInteracted, onComplete]);

  const handleClose = () => {
    setHasInteracted(true);
    onClose();
    if (onComplete) {
      onComplete();
    }
  };

  const nextImage = () => {
    if (media.urls && media.urls.length > 0) {
      const urlsLength = media.urls.length;
      setCurrentImageIndex((prev) => (prev + 1) % urlsLength);
    }
  };

  const prevImage = () => {
    if (media.urls && media.urls.length > 0) {
      const urlsLength = media.urls.length;
      setCurrentImageIndex((prev) => (prev - 1 + urlsLength) % urlsLength);
    }
  };

  const renderMedia = () => {
    switch (media.type) {
      case 'video':
        return (
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            <video
              src={media.url}
              controls
              autoPlay={isPlaying}
              muted={isMuted}
              className="w-full h-full object-contain"
              onEnded={() => {
                if (onComplete) onComplete();
              }}
            />
          </div>
        );

      case 'audio':
        return (
          <div className="w-full bg-gradient-to-br from-primary to-amber-500 rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                {isPlaying ? (
                  <Volume2 className="w-16 h-16 text-white animate-pulse" />
                ) : (
                  <Play className="w-16 h-16 text-white" />
                )}
              </div>
              <audio
                src={media.url}
                controls
                autoPlay={isPlaying}
                muted={isMuted}
                className="w-full"
                onEnded={() => {
                  if (onComplete) onComplete();
                }}
              />
            </div>
          </div>
        );

      case 'images':
        return (
          <div className="relative w-full h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            {media.urls && media.urls.length > 0 && (
              <>
                <img
                  src={media.urls[currentImageIndex]}
                  alt={`Slide ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {media.urls.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {media.urls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? 'bg-white w-8'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="w-full bg-gradient-to-br from-warm-100 to-warm-200 rounded-lg p-8">
            <div className="prose prose-sm max-w-none">
              <div
                className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: media.description || '' }}
              />
            </div>
          </div>
        );

      case 'youtube':
        // Build YouTube embed URL with proper parameters for mobile autoplay
        const youtubeParams = new URLSearchParams({
          autoplay: isPlaying ? '1' : '0',
          mute: isMuted ? '1' : '0',
          playsinline: '1', // Important for iOS
          enablejsapi: '1', // Enable YouTube API
          rel: '0', // Don't show related videos
          modestbranding: '1', // Reduce YouTube branding
        });
        
        const youtubeUrl = `https://www.youtube.com/embed/${media.youtubeId}?${youtubeParams.toString()}`;
        
        const handleMuteToggle = () => {
          setHasInteracted(true);
          const newMuted = !isMuted;
          setIsMuted(newMuted);
          
          // Update iframe src to reflect mute state change
          if (youtubeIframeRef.current) {
            const newParams = new URLSearchParams({
              autoplay: '1',
              mute: newMuted ? '1' : '0',
              playsinline: '1',
              enablejsapi: '1',
              rel: '0',
              modestbranding: '1',
            });
            youtubeIframeRef.current.src = `https://www.youtube.com/embed/${media.youtubeId}?${newParams.toString()}`;
          }
        };
        
        return (
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden group">
            <iframe
              ref={youtubeIframeRef}
              src={youtubeUrl}
              title={media.title || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              onLoad={() => {
                // Ensure autoplay works on mobile after iframe loads
                if (isPlaying && isMobileDevice()) {
                  // Small delay to ensure iframe is ready
                  setTimeout(() => {
                    if (youtubeIframeRef.current) {
                      // Try to trigger play via postMessage (if YouTube API is available)
                      youtubeIframeRef.current.contentWindow?.postMessage(
                        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                        '*'
                      );
                    }
                  }, 500);
                }
              }}
            />
            {/* Mute/Unmute button overlay for better UX */}
            {isMuted && (
              <button
                onClick={handleMuteToggle}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all z-10 flex items-center gap-2 group-hover:opacity-100 opacity-90"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-5 h-5" />
                    <span className="text-xs font-medium hidden sm:inline">Tap to unmute</span>
                  </>
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div className="flex-1">
            {media.title && (
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{media.title}</h2>
            )}
            {media.description && media.type !== 'text' && (
              <p className="text-sm text-gray-600">{media.description}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Media Content */}
        <div className="p-6">
          {renderMedia()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            {media.duration && (
              <span>Duration: {Math.floor(media.duration / 60)}:{String(media.duration % 60).padStart(2, '0')}</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-white font-semibold rounded-full hover:from-primary hover:to-indigo-700 active:scale-95 transition-all shadow-lg hover:shadow-xl"
          >
            Continue to Dialogue
          </button>
        </div>
      </div>
    </div>
  );
}
