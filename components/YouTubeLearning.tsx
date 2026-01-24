'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCw,
  Volume2,
  Mic,
  Loader2,
  Target,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Youtube,
  Settings,
} from 'lucide-react';
import { Checkpoint, CEFRLevel, VideoSegment, RecommendedSegment, ShadowReadingSession, UserLearningProfile } from '@/types';
import * as GeminiService from '@/lib/gemini/service';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeLearningProps {
  checkpoint: Checkpoint;
  userLevel?: CEFRLevel;
  onClose: () => void;
}

export default function YouTubeLearning({ checkpoint, userLevel = 'B1', onClose }: YouTubeLearningProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [manualSubtitles, setManualSubtitles] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedSegment, setSelectedSegment] = useState<VideoSegment | null>(null);
  const [recommendedSegments, setRecommendedSegments] = useState<RecommendedSegment[]>([]);
  const [shadowSession, setShadowSession] = useState<ShadowReadingSession | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1.0 | 1.25>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [userProfile, setUserProfile] = useState<UserLearningProfile>({
    cefrLevel: userLevel,
    preferredTopics: [],
    learningPath: 'daily',
    recentSegments: [],
  });
  const [voiceInput, setVoiceInput] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const progressCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopingRef = useRef<boolean>(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return;
    }

    // Load the IFrame Player API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube IFrame API ready');
    };

    return () => {
      // Cleanup on unmount
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current);
        progressCheckIntervalRef.current = null;
      }
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player on unmount:', e);
        }
        youtubePlayerRef.current = null;
      }
    };
  }, []);

  // Cleanup when segment changes or component unmounts
  useEffect(() => {
    return () => {
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current);
        progressCheckIntervalRef.current = null;
      }
    };
  }, [selectedSegment]);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Analyze YouTube video with all information together
  const handleAnalyzeVideo = async () => {
    // Validate input
    if (!videoUrl.trim() && !manualSubtitles.trim()) {
      alert('Please provide either a YouTube URL or manual subtitles.');
      return;
    }

    setIsAnalyzing(true);
    
    // Process personalization first if provided
    let updatedProfile = userProfile;
    if (voiceInput.trim()) {
      try {
        setIsProcessingVoice(true);
        const response = await fetch('/api/youtube/extract-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: voiceInput }),
        });

        if (response.ok) {
          const data = await response.json();
          updatedProfile = {
            ...userProfile,
            preferredTopics: data.topics || [],
          };
          setUserProfile(updatedProfile);
          console.log('✅ Updated profile with topics:', data.topics);
        }
      } catch (error) {
        console.warn('Personalization failed, continuing with video analysis:', error);
      } finally {
        setIsProcessingVoice(false);
      }
    }

    try {
      // If using manual input, parse and analyze directly
      if (useManualInput && manualSubtitles.trim()) {
        console.log('📝 Analyzing manual subtitles...');
        const response = await fetch('/api/youtube/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manualSubtitles: manualSubtitles.trim(),
            userLevel,
            videoUrl: videoUrl || 'manual-input',
            personalization: voiceInput.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to analyze subtitles');
        }

        const data = await response.json();
        setAnalysis(data);
        
        if (data.segments && data.segments.length > 0) {
          const recommendations = generateRecommendations(data.segments, updatedProfile);
          setRecommendedSegments(recommendations);
          console.log(`🎯 Generated ${recommendations.length} recommendations`);
        }
        return;
      }

      // Auto-extract from YouTube (with manual subtitles as fallback)
      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        if (manualSubtitles.trim()) {
          // If URL is invalid but we have manual subtitles, use them
          setUseManualInput(true);
          return handleAnalyzeVideo();
        }
        alert('Invalid YouTube URL. Please enter a valid YouTube video URL or provide manual subtitles.');
        setIsAnalyzing(false);
        return;
      }

      console.log('🎬 Analyzing video:', videoId);
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          videoId,
          userLevel,
          manualSubtitles: manualSubtitles.trim() || undefined, // Include manual subtitles as fallback
          personalization: voiceInput.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If auto-extraction fails but we have manual subtitles, try using them
        if (manualSubtitles.trim() && errorData.error?.includes('subtitles')) {
          console.log('⚠️ Auto-extraction failed, trying manual subtitles...');
          setUseManualInput(true);
          return handleAnalyzeVideo();
        }
        throw new Error(errorData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      console.log('✅ Analysis complete:', {
        hasSubtitles: data.hasSubtitles,
        segmentCount: data.segments?.length || 0,
        allSegmentCount: data.allSegments?.length || 0,
      });
      
      // Check if video has subtitles
      if (!data.hasSubtitles || data.error) {
        // If we have manual subtitles, use them
        if (manualSubtitles.trim()) {
          console.log('⚠️ Auto-extraction failed, using manual subtitles...');
          setUseManualInput(true);
          return handleAnalyzeVideo();
        }
        alert(data.error || 'This video does not have subtitles available. Please paste subtitles manually in the "Manual Subtitles" field.');
        setIsAnalyzing(false);
        return;
      }
      
      setAnalysis(data);
      
      // Generate recommendations from matching segments
      if (data.segments && data.segments.length > 0) {
        const recommendations = generateRecommendations(data.segments, updatedProfile);
        setRecommendedSegments(recommendations);
        console.log(`🎯 Generated ${recommendations.length} recommendations`);
      } else {
        alert(`No segments found matching your level (${userLevel}). The video might be too easy or too difficult.`);
      }
    } catch (error: any) {
      console.error('Failed to analyze video:', error);
      // Try manual subtitles as last resort
      if (manualSubtitles.trim() && !useManualInput) {
        console.log('⚠️ Error occurred, trying manual subtitles...');
        setUseManualInput(true);
        return handleAnalyzeVideo();
      }
      alert(error.message || 'Failed to analyze video. Please check your connection and try again, or use manual subtitle input.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate personalized recommendations
  const generateRecommendations = (
    segments: VideoSegment[],
    profile: UserLearningProfile
  ): RecommendedSegment[] => {
    return segments
      .map(segment => {
        // Calculate relevance score (topic match)
        const topicMatch = profile.preferredTopics.length > 0
          ? segment.topics.filter(t => profile.preferredTopics.includes(t)).length / Math.max(profile.preferredTopics.length, 1)
          : 0.5; // Default relevance if no topics
        
        // Calculate difficulty match (±1 level tolerance)
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const userLevelIndex = levelOrder.indexOf(profile.cefrLevel);
        const segmentLevelIndex = levelOrder.indexOf(segment.cefrLevel);
        const levelDiff = Math.abs(userLevelIndex - segmentLevelIndex);
        const difficultyMatch = levelDiff <= 1 ? (1 - levelDiff * 0.3) : 0.2;
        
        // Calculate freshness (not recently viewed)
        const freshnessScore = profile.recentSegments.includes(segment.id) ? 0.3 : 1.0;
        
        // Overall score: relevance 60% + difficulty 30% + freshness 10%
        const overallScore = topicMatch * 0.6 + difficultyMatch * 0.3 + freshnessScore * 0.1;
        
        return {
          ...segment,
          relevanceScore: topicMatch * 100,
          difficultyMatch: difficultyMatch * 100,
          freshnessScore: freshnessScore * 100,
          overallScore: overallScore * 100,
        };
      })
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10); // Top 10 recommendations
  };

  // Process voice input for personalized recommendations
  const handleVoiceInput = async () => {
    if (!voiceInput.trim()) return;
    
    setIsProcessingVoice(true);
    try {
      // Extract topics from voice input using AI
      const response = await fetch('/api/youtube/extract-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract topics');
      }

      const data = await response.json();
      const newProfile: UserLearningProfile = {
        ...userProfile,
        preferredTopics: data.topics || [],
        learningPath: data.learningPath || 'daily',
      };
      
      setUserProfile(newProfile);
      
      // Regenerate recommendations with new profile
      if (analysis?.segments) {
        const recommendations = generateRecommendations(analysis.segments, newProfile);
        setRecommendedSegments(recommendations);
      }
      
      setVoiceInput('');
    } catch (error) {
      console.error('Failed to process voice input:', error);
      alert('Failed to process your input. Please try again.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Start shadow reading session
  const startShadowReading = (segment: VideoSegment) => {
    console.log('🎯 Starting shadow reading for segment:', segment);
    
    // Clear existing progress monitoring
    if (progressCheckIntervalRef.current) {
      clearInterval(progressCheckIntervalRef.current);
      progressCheckIntervalRef.current = null;
    }
    
    // Reset player state
    setPlayerReady(false);
    setIsPlaying(false);
    
    setSelectedSegment(segment);
    setShadowSession({
      segmentId: segment.id,
      playbackSpeed: 1.0,
      isLooping: false,
      currentPlayCount: 0,
    });
    setPlaybackSpeed(1.0);
    setIsLooping(false);
    isLoopingRef.current = false; // Sync ref
    
    // Initialize YouTube player with a delay to ensure DOM is ready
    setTimeout(() => {
      initializeYouTubePlayer(segment);
    }, 300);
  };

  // Initialize YouTube Player with IFrame API
  const initializeYouTubePlayer = (segment: VideoSegment) => {
    const videoId = extractVideoId(videoUrl) || analysis?.videoId;
    if (!videoId) {
      console.error('No video ID found');
      return;
    }

    if (!videoRef.current) {
      console.error('Video ref not found');
      return;
    }

    console.log('🎬 Initializing YouTube player with video ID:', videoId);

    // Wait for API to be ready
    const checkAPI = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkAPI);
        
        // Destroy existing player if any
        if (youtubePlayerRef.current) {
          try {
            console.log('Destroying existing player');
            youtubePlayerRef.current.destroy();
            youtubePlayerRef.current = null;
          } catch (e) {
            console.warn('Error destroying player:', e);
          }
        }

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (!videoRef.current) {
            console.error('Video ref disappeared');
            return;
          }

          // Create new player - IMPORTANT: Pass the DOM element directly, not an ID
          try {
            console.log('Creating new YouTube player with element:', videoRef.current);
            youtubePlayerRef.current = new window.YT.Player(videoRef.current, {
            videoId: videoId,
            playerVars: {
              start: Math.floor(segment.startTime),
              autoplay: 1,
              controls: 1,
              enablejsapi: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: (event: any) => {
                console.log('✅ YouTube player ready');
                setPlayerReady(true);
                try {
                  // Seek to start time first
                  if (typeof event.target.seekTo === 'function') {
                    event.target.seekTo(segment.startTime, true);
                  }
                  
                  // Set playback rate
                  if (typeof event.target.setPlaybackRate === 'function') {
                    event.target.setPlaybackRate(playbackSpeed);
                  }
                  
                  // Start playing after a brief delay to ensure seek completes
                  setTimeout(() => {
                    if (typeof event.target.playVideo === 'function') {
                      event.target.playVideo();
                    }
                    // Start monitoring progress after playback begins
                    startProgressMonitoring(segment);
                  }, 200);
                } catch (error) {
                  console.warn('Error in onReady callback:', error);
                }
              },
              onStateChange: (event: any) => {
                try {
                  // YT.PlayerState.PLAYING = 1
                  // YT.PlayerState.PAUSED = 2
                  // YT.PlayerState.ENDED = 0
                  // YT.PlayerState.BUFFERING = 3
                  if (event.data === 1) {
                    // Playing
                    setIsPlaying(true);
                    console.log('▶️ Video playing');
                  } else if (event.data === 2) {
                    // Paused
                    setIsPlaying(false);
                    console.log('⏸️ Video paused');
                  } else if (event.data === 0) {
                    // Video ended - only matters if entire video ended (not segment)
                    console.log('Video ended naturally');
                    setIsPlaying(false);
                  } else if (event.data === 3) {
                    // Buffering
                    console.log('⏳ Video buffering...');
                  }
                } catch (error) {
                  console.warn('Error in onStateChange callback:', error);
                }
              },
              onError: (event: any) => {
                console.error('YouTube player error:', event.data);
                // Error codes: https://developers.google.com/youtube/iframe_api_reference#onError
                // 2 – Invalid video ID
                // 5 – HTML5 player error
                // 100 – Video not found or private
                // 101, 150 – Video not allowed to be played in embedded players
                alert(`Unable to play this video (Error ${event.data}). Please try another video.`);
              },
            },
          });
          } catch (error) {
            console.error('Error creating YouTube player:', error);
            youtubePlayerRef.current = null;
          }
        }, 100);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkAPI);
      if (!youtubePlayerRef.current) {
        console.error('YouTube Player API failed to load');
        alert('Failed to load YouTube player. Please refresh and try again.');
      }
    }, 10000);
  };

  // Monitor video progress and handle end time
  const startProgressMonitoring = (segment: VideoSegment) => {
    // Clear existing interval
    if (progressCheckIntervalRef.current) {
      clearInterval(progressCheckIntervalRef.current);
      progressCheckIntervalRef.current = null;
    }

    let logCounter = 0; // Reduce log frequency
    
    // Check progress every 50ms for more precision
    progressCheckIntervalRef.current = setInterval(() => {
      if (!youtubePlayerRef.current || !segment) {
        // Clear interval if player is gone
        if (progressCheckIntervalRef.current) {
          clearInterval(progressCheckIntervalRef.current);
          progressCheckIntervalRef.current = null;
        }
        return;
      }

      try {
        // Check if player is ready and has the method
        if (typeof youtubePlayerRef.current.getCurrentTime !== 'function') {
          return; // Player not ready yet
        }

        const currentTime = youtubePlayerRef.current.getCurrentTime();
        const endTime = segment.endTime || (segment.startTime + (segment.duration || 0));
        
        // Trigger slightly before end time to avoid overshooting (300ms buffer)
        const triggerTime = endTime - 0.3;

        // Log every 1 second (20 iterations at 50ms) instead of every check
        logCounter++;
        if (logCounter >= 20) {
          console.log(`⏱️ Progress: ${currentTime.toFixed(2)}s / ${endTime.toFixed(2)}s, loop: ${isLoopingRef.current}`);
          logCounter = 0;
        }

        // If we've reached or passed the trigger time
        if (currentTime >= triggerTime && currentTime < endTime + 1) {
          console.log(`🔚 Reached end time at ${currentTime.toFixed(2)}s (target: ${endTime.toFixed(2)}s)`);
          
          if (isLoopingRef.current) {
            // Loop: jump back to start and continue playing
            console.log('🔁 Looping back to start:', segment.startTime);
            if (typeof youtubePlayerRef.current.seekTo === 'function') {
              youtubePlayerRef.current.seekTo(segment.startTime, true);
              
              // Ensure playback continues after seeking
              setTimeout(() => {
                if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
                  youtubePlayerRef.current.playVideo();
                }
              }, 100);
              
              if (shadowSession) {
                setShadowSession({
                  ...shadowSession,
                  currentPlayCount: shadowSession.currentPlayCount + 1,
                });
              }
            }
          } else {
            // No loop: pause at end
            console.log('⏸️ Pausing at end (no loop)');
            if (typeof youtubePlayerRef.current.pauseVideo === 'function') {
              youtubePlayerRef.current.pauseVideo();
            }
            setIsPlaying(false);
            // Clear monitoring when paused
            if (progressCheckIntervalRef.current) {
              clearInterval(progressCheckIntervalRef.current);
              progressCheckIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.warn('Error checking progress:', error);
        // Clear interval on error
        if (progressCheckIntervalRef.current) {
          clearInterval(progressCheckIntervalRef.current);
          progressCheckIntervalRef.current = null;
        }
      }
    }, 50); // Check every 50ms for better precision
  };

  // Play segment with speed control
  const playSegment = () => {
    console.log('▶️ Play segment clicked', { playerReady, hasPlayer: !!youtubePlayerRef.current });
    
    if (!selectedSegment) {
      console.warn('No segment selected');
      return;
    }
    
    // Check if player exists and is ready
    if (youtubePlayerRef.current && playerReady && typeof youtubePlayerRef.current.seekTo === 'function') {
      try {
        console.log('Using existing player to play from:', selectedSegment.startTime);
        // Use existing player
        youtubePlayerRef.current.seekTo(selectedSegment.startTime, true);
        if (typeof youtubePlayerRef.current.setPlaybackRate === 'function') {
          youtubePlayerRef.current.setPlaybackRate(playbackSpeed);
        }
        if (typeof youtubePlayerRef.current.playVideo === 'function') {
          youtubePlayerRef.current.playVideo();
        }
        setIsPlaying(true);
        startProgressMonitoring(selectedSegment);
      } catch (error) {
        console.warn('Error playing segment, reinitializing player:', error);
        // Player might not be ready, reinitialize
        setPlayerReady(false);
        initializeYouTubePlayer(selectedSegment);
      }
    } else {
      console.log('Player not ready, initializing...');
      // Initialize player
      initializeYouTubePlayer(selectedSegment);
    }
  };

  // Pause segment
  const pauseSegment = () => {
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
      try {
        youtubePlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } catch (error) {
        console.warn('Error pausing video:', error);
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  // Toggle playback speed
  const toggleSpeed = () => {
    const speeds: (0.75 | 1.0 | 1.25)[] = [0.75, 1.0, 1.25];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    
    console.log(`🎚️ Speed changed to: ${nextSpeed}x`);
    
    // Update YouTube player speed
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.setPlaybackRate === 'function') {
      try {
        youtubePlayerRef.current.setPlaybackRate(nextSpeed);
      } catch (error) {
        console.warn('Error setting playback rate:', error);
      }
    }
    
    if (shadowSession) {
      setShadowSession({ ...shadowSession, playbackSpeed: nextSpeed });
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    const newLooping = !isLooping;
    setIsLooping(newLooping);
    isLoopingRef.current = newLooping; // Sync ref immediately
    
    console.log(`🔁 Loop ${newLooping ? 'enabled' : 'disabled'}`);
    
    if (shadowSession) {
      setShadowSession({ ...shadowSession, isLooping: newLooping });
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-[#fcfbf9]/90 w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative backdrop-blur-2xl border border-white/50">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-5 flex justify-between items-center bg-gradient-to-b from-[#fcfbf9] via-[#fcfbf9]/95 to-transparent pb-8 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">YouTube Learning</h2>
              <p className="text-xs text-gray-500">{checkpoint.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm border border-black/5 text-gray-400 hover:text-gray-800 hover:bg-white transition-all pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 pt-24 pb-32 space-y-6 scrollbar-hide">
          {/* Unified Input Form: Video URL + Subtitles + Personalization */}
          {!analysis && (
            <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-black/[0.08] space-y-5">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Video Information
              </h3>

              {/* YouTube Video URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Video URL <span className="text-gray-400">(Required)</span>
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-gray-700 focus:outline-none text-sm bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The system will try to extract subtitles automatically. If extraction fails, you can paste subtitles manually below.
                </p>
              </div>

              {/* Manual Subtitles (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manual Subtitles <span className="text-gray-400">(Optional - use if auto-extraction fails)</span>
                </label>
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setUseManualInput(!useManualInput)}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {useManualInput ? '✓' : '○'} Use manual subtitles
                  </button>
                </div>
                {useManualInput && (
                  <>
                    <p className="text-xs text-gray-600 mb-2">
                      Paste subtitles in this format (timecode + text):
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg mb-2 text-xs text-gray-500 font-mono whitespace-pre-wrap border border-gray-200">
{`0:00
Hey guys! It's Ariannita la Gringa...
0:06
where I'm at today? Today I'm at Starbucks...
0:12
the beautiful Starbucks logo...`}
                    </div>
                    <textarea
                      value={manualSubtitles}
                      onChange={(e) => setManualSubtitles(e.target.value)}
                      placeholder="0:00&#10;Your subtitle text here...&#10;0:06&#10;More text here..."
                      className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:border-gray-700 focus:outline-none text-sm bg-white font-mono resize-y"
                    />
                  </>
                )}
              </div>

              {/* Personalization (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personalize Your Learning <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.value)}
                  placeholder="e.g., I work in tech, love coffee, enjoy traveling..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-gray-700 focus:outline-none text-sm bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe your daily life, work, or interests to get personalized segment recommendations.
                </p>
              </div>

              {/* Analyze Button */}
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={handleAnalyzeVideo}
                  disabled={
                    (!videoUrl.trim() && !manualSubtitles.trim()) || 
                    isAnalyzing ||
                    (useManualInput && !manualSubtitles.trim())
                  }
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Analyze & Find Segments
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Your level: <span className="font-medium">{userLevel}</span> | 
                  The system will analyze and recommend segments matching your level.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Analysis Results & Recommendations */}
          {analysis && !selectedSegment && (
            <div className="space-y-4">
              {/* Video Info */}
              <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-black/[0.08]">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{analysis.title || 'Video Analysis'}</h3>
                <p className="text-sm text-gray-600 mb-4">{analysis.description || ''}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Segments: {analysis.segments?.length || 0}</span>
                  <span>Duration: {Math.floor(analysis.duration / 60)}m {analysis.duration % 60}s</span>
                  <span className={analysis.hasSubtitles ? 'text-green-600' : 'text-orange-600'}>
                    {analysis.hasSubtitles ? '✓ Subtitles' : '⚠ Auto-generated'}
                  </span>
                </div>
              </div>

              {/* Recommended Segments */}
              {recommendedSegments.length > 0 ? (
                <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-black/[0.08]">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-600" />
                    Recommended for You ({recommendedSegments.length} segments)
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recommendedSegments.map((segment, idx) => (
                      <div
                        key={segment.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-all cursor-pointer"
                        onClick={() => startShadowReading(segment)}
                      >
                            <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="px-2.5 py-1 bg-gray-900 text-white rounded-md text-xs font-bold shadow-sm">
                                #{idx + 1}
                              </span>
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
                                {segment.cefrLevel}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                {Math.floor(segment.startTime / 60)}:{String(Math.floor(segment.startTime % 60)).padStart(2, '0')} - 
                                {Math.floor(segment.endTime / 60)}:{String(Math.floor(segment.endTime % 60)).padStart(2, '0')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mb-3 line-clamp-3 leading-relaxed font-medium pr-2">
                              {segment.subtitle}
                            </p>
                            <div className="flex items-center flex-wrap gap-2 text-xs">
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                                <Target className="w-3 h-3" />
                                {Math.round(segment.overallScore)}% match
                              </span>
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
                                {Math.round(segment.speechRate)} wpm
                              </span>
                              <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">
                                Difficulty: {segment.difficultyScore}
                              </span>
                              {segment.topics.length > 0 && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                                  {segment.topics.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => startShadowReading(segment)}
                            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2 shadow-sm flex-shrink-0"
                          >
                            <Play className="w-4 h-4" />
                            Practice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : analysis && analysis.segments && analysis.segments.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 text-orange-700">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">No segments match your level</p>
                      <p className="text-sm">Try selecting segments from the "All Segments" section below.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* All Segments (by level) */}
              {analysis && analysis.allSegments && analysis.allSegments.length > 0 && (
                <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-black/[0.08]">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-600" />
                    All Segments by Level ({analysis.allSegments.length} total)
                  </h3>
                  
                  {/* Level Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                      const count = analysis.allSegments?.filter((s: VideoSegment) => s.cefrLevel === level).length || 0;
                      const isUserLevel = level === userLevel;
                      return (
                        <div
                          key={level}
                          className={`p-3 rounded-lg border text-center transition-all cursor-pointer hover:scale-105 ${
                            isUserLevel
                              ? 'bg-gray-900 text-white border-gray-900'
                              : count > 0
                              ? 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
                              : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'
                          }`}
                          onClick={() => {
                            if (count > 0) {
                              // Scroll to that level's segments
                              const firstSegment = analysis.allSegments.find((s: VideoSegment) => s.cefrLevel === level);
                              if (firstSegment) {
                                startShadowReading(firstSegment);
                              }
                            }
                          }}
                        >
                          <div className="font-bold text-lg">{level}</div>
                          <div className="text-xs opacity-80">{count} segments</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Segment List by Level */}
                  <div className="space-y-4">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                      const levelSegments = analysis.allSegments?.filter((s: VideoSegment) => s.cefrLevel === level) || [];
                      if (levelSegments.length === 0) return null;
                      
                      return (
                        <div key={level} className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{level}</span>
                            <span className="text-gray-500">({levelSegments.length} segments)</span>
                          </h4>
                          <div className="space-y-2 pl-3">
                            {levelSegments.slice(0, 5).map((segment: VideoSegment, idx: number) => (
                              <div
                                key={segment.id}
                                className="group p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => startShadowReading(segment)}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                      {Math.floor(segment.startTime / 60)}:{String(Math.floor(segment.startTime % 60)).padStart(2, '0')}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {segment.duration}s • {Math.round(segment.speechRate)} wpm
                                    </span>
                                  </div>
                                  <Play className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                                </div>
                                <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed font-medium group-hover:text-gray-950">
                                  {segment.subtitle}
                                </p>
                              </div>
                            ))}
                            {levelSegments.length > 5 && (
                              <p className="text-xs text-gray-500 text-center py-2">
                                +{levelSegments.length - 5} more segments at this level
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Shadow Reading Practice */}
          {selectedSegment && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-black/[0.08]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Shadow Reading Practice</h3>
                  <button
                    onClick={() => setSelectedSegment(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to Segments
                  </button>
                </div>

                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg mb-4 overflow-hidden relative">
                  <div
                    ref={videoRef}
                    className="w-full h-full"
                  >
                    {/* YouTube Player API will replace this div with iframe */}
                  </div>
                  {!playerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Loading video...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtitle Display - Enhanced UI */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
                  {/* Subtitle Text with Better Typography */}
                  <div className="mb-4">
                    <p className="text-lg text-gray-900 leading-relaxed text-center font-medium px-2 py-3 min-h-[4rem] flex items-center justify-center">
                      {selectedSegment.subtitle}
                    </p>
                  </div>
                  
                  {/* Metadata with Visual Hierarchy */}
                  <div className="flex items-center justify-center gap-3 flex-wrap pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full">
                      <span className="text-xs font-semibold text-blue-700">Level</span>
                      <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                        {selectedSegment.cefrLevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">
                        {Math.round(selectedSegment.speechRate)} wpm
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
                      <span className="text-xs text-gray-600">
                        {Math.floor(selectedSegment.startTime / 60)}:{String(Math.floor(selectedSegment.startTime % 60)).padStart(2, '0')} - 
                        {Math.floor((selectedSegment.endTime || selectedSegment.startTime + selectedSegment.duration) / 60)}:{String(Math.floor((selectedSegment.endTime || selectedSegment.startTime + selectedSegment.duration) % 60)).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Controls */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Primary Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={isPlaying ? pauseSegment : playSegment}
                        className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                      <button
                        onClick={toggleSpeed}
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all shadow-sm"
                        aria-label={`Playback speed: ${playbackSpeed}x`}
                      >
                        {playbackSpeed}x
                      </button>
                      <button
                        onClick={toggleLoop}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                          isLooping
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                        aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
                      >
                        <RotateCw className={`w-4 h-4 ${isLooping ? 'animate-spin' : ''}`} />
                        Loop
                      </button>
                    </div>
                    
                    {/* Secondary Controls */}
                    <div className="flex items-center gap-3">
                      {shadowSession && shadowSession.currentPlayCount > 0 && (
                        <div className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 font-medium">
                          Played {shadowSession.currentPlayCount}x
                        </div>
                      )}
                      <button 
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                        aria-label="Record your pronunciation"
                      >
                        <Mic className="w-4 h-4" />
                        Record
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
