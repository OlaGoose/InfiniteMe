'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Footprints,
  Settings,
  Navigation,
  Award,
  X,
  Plus,
  Trash2,
  Check,
  User,
  Mic,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  AlertCircle,
  BookOpen,
  RotateCw,
  ChevronLeft,
  Bot,
  Languages,
  RefreshCw,
  Target,
  Umbrella,
  CloudRain,
  Sun,
  ShoppingBag,
  CloudLightning,
  Snowflake,
  Flame,
  MessageSquare,
  ArrowUpRight,
  History,
  Calendar,
  Clock,
  Share2,
  Activity,
  Loader2,
  MapPinned,
} from 'lucide-react';
import Map from './Map';
import Joystick from './Joystick';
import Toast, { ToastType } from './Toast';
import SelectionToolbar from './SelectionToolbar';
import FlashcardDeck from './FlashcardDeck';
import {
  LatLng,
  UserStats,
  Checkpoint,
  ChatMessage,
  MapStyle,
  Flashcard,
  DifficultyLevel,
  WeatherType,
  ShopItem,
  EventRecord,
  CheckpointType,
} from '@/types';
import { calculateNextReview, getDueCards, getStudyStats } from '@/utils/anki';
import {
  METERS_PER_STEP,
  INTERACTION_RADIUS_METERS,
  MAP_STYLES,
  DIFFICULTY_CONFIG,
  WEATHER_CONFIG,
  CHECKPOINTS,
} from '@/constants';
import { computeDestinationPoint } from '@/utils/geo';
import { storageService } from '@/lib/supabase/storage';
import * as GeminiService from '@/lib/gemini/service';
import { placeService, PlaceInfo } from '@/lib/places/service';

const MAX_DRAG_DISTANCE = 150;

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function GameApp() {
  const [hasStarted, setHasStarted] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [history, setHistory] = useState<EventRecord[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [stepDetected, setStepDetected] = useState(false);
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [weatherTimeLeft, setWeatherTimeLeft] = useState(0);
  const [activeDialog, setActiveDialog] = useState<{
    checkpoint: Checkpoint;
    messages: ChatMessage[];
    negotiatingItem?: ShopItem;
  } | null>(null);
  const [activeShop, setActiveShop] = useState<Checkpoint | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [challengeRound, setChallengeRound] = useState(0);
  const [challengeResult, setChallengeResult] = useState<{
    score?: number;
    feedback: string;
    success: boolean;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFlashcardDeck, setShowFlashcardDeck] = useState(false);
  const [showHistoryLog, setShowHistoryLog] = useState(false);
  const [showOutOfStepsModal, setShowOutOfStepsModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<EventRecord | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('light');
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [selectionPopup, setSelectionPopup] = useState<{
    x: number;
    y: number;
    text: string;
    context: string;
  } | null>(null);
  const [currentReviewCard, setCurrentReviewCard] = useState<Flashcard | null>(null);
  const [reviewQuality, setReviewQuality] = useState<number | null>(null);
  const [previewLocation, setPreviewLocation] = useState<LatLng | null>(null);
  const [plannedDistance, setPlannedDistance] = useState<number>(0);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editorTarget, setEditorTarget] = useState<Partial<Checkpoint> | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceInfo[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [showPlaceSelector, setShowPlaceSelector] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [optimizingMessageId, setOptimizingMessageId] = useState<string | null>(null);
  const [pedometerSteps, setPedometerSteps] = useState(0);

  const activeDialogRef = useRef(activeDialog);
  useEffect(() => {
    activeDialogRef.current = activeDialog;
  }, [activeDialog]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef(autoPlayAudio);
  useEffect(() => {
    autoPlayRef.current = autoPlayAudio;
  }, [autoPlayAudio]);
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  const checkpointsRef = useRef(checkpoints);
  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);
  const recognitionRef = useRef<any>(null);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      const [loadedStats, loadedCheckpoints, loadedFlashcards, loadedHistory] = await Promise.all([
        storageService.getStats(),
        storageService.getCheckpoints(),
        storageService.getFlashcards(),
        storageService.getHistory(),
      ]);
      setStats(loadedStats);
      setCheckpoints(loadedCheckpoints);
      setFlashcards(loadedFlashcards);
      setHistory(loadedHistory);
    };
    loadData();
  }, []);

  // Debounced save functions to reduce database writes
  const debouncedSaveStats = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveCheckpoints = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveFlashcards = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save data with debouncing (wait 1 second after last change)
  useEffect(() => {
    if (!stats) return;
    
    if (debouncedSaveStats.current) {
      clearTimeout(debouncedSaveStats.current);
    }
    
    debouncedSaveStats.current = setTimeout(() => {
      storageService.saveStats(stats);
    }, 1000);

    return () => {
      if (debouncedSaveStats.current) {
        clearTimeout(debouncedSaveStats.current);
      }
    };
  }, [stats]);

  useEffect(() => {
    if (checkpoints.length === 0) return;
    
    if (debouncedSaveCheckpoints.current) {
      clearTimeout(debouncedSaveCheckpoints.current);
    }
    
    debouncedSaveCheckpoints.current = setTimeout(() => {
      storageService.saveCheckpoints(checkpoints);
    }, 1000);

    return () => {
      if (debouncedSaveCheckpoints.current) {
        clearTimeout(debouncedSaveCheckpoints.current);
      }
    };
  }, [checkpoints]);

  useEffect(() => {
    if (flashcards.length === 0) return;
    
    if (debouncedSaveFlashcards.current) {
      clearTimeout(debouncedSaveFlashcards.current);
    }
    
    debouncedSaveFlashcards.current = setTimeout(() => {
      storageService.saveFlashcards(flashcards);
    }, 1000);

    return () => {
      if (debouncedSaveFlashcards.current) {
        clearTimeout(debouncedSaveFlashcards.current);
      }
    };
  }, [flashcards]);

  // Handle text selection in dialog messages
  const handleTextSelection = useCallback(() => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      // Only show toolbar for meaningful selections (> 2 characters)
      if (selectedText && selectedText.length > 2 && activeDialog) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect && rect.width > 0 && rect.height > 0) {
          setSelectionPopup({
            x: rect.left + rect.width / 2,
            y: rect.top,
            text: selectedText,
            context: activeDialog.messages[activeDialog.messages.length - 1]?.text || '',
          });
        }
      }
    }, 10);
  }, [activeDialog]);

  // Handle translation of selected text
  const handleTranslateSelection = useCallback(async (text: string): Promise<string> => {
    try {
      const result = await GeminiService.translateText(text);
      return result;
    } catch (error) {
      console.error('Selection translation error:', error);
      throw error;
    }
  }, []);

  // Handle adding selected word to flashcards
  const handleAddToFlashcard = useCallback((word: string, translation: string) => {
    const now = Date.now();
    const newFlashcard: Flashcard = {
      id: `flashcard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'vocabulary',
      front: word,
      back: translation,
      context: activeDialog?.messages[activeDialog.messages.length - 1]?.text,
      createdAt: now,
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewDate: now,
    };

    setFlashcards(prev => [newFlashcard, ...prev]);
    setToast({ message: `"${word}" saved to flashcards`, type: 'success' });
  }, [activeDialog]);

  // Handle flashcard review with Anki algorithm
  const handleReviewFlashcard = useCallback((card: Flashcard, quality: number) => {
    const reviewResult = calculateNextReview(card, quality);
    
    setFlashcards(prev =>
      prev.map(fc =>
        fc.id === card.id
          ? {
              ...fc,
              reviewCount: fc.reviewCount + 1,
              easeFactor: reviewResult.easeFactor,
              interval: reviewResult.interval,
              nextReviewDate: reviewResult.nextReviewDate,
              lastReviewDate: reviewResult.lastReviewDate,
              quality,
            }
          : fc
      )
    );

    // Move to next card
    const dueCards = getDueCards(flashcards);
    const currentIndex = dueCards.findIndex(c => c.id === card.id);
    if (currentIndex < dueCards.length - 1) {
      setCurrentCardIndex(currentIndex + 1);
    } else {
      setShowFlashcardDeck(false);
      setToast({ message: 'Review complete! Great job!', type: 'success' });
    }
  }, [flashcards]);

  // Start game function - handles permissions and initialization
  const handleStartGame = async () => {
    // Request motion sensor permission (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        await (DeviceMotionEvent as any).requestPermission();
      } catch (e) {
        console.warn('Motion permission denied:', e);
      }
    }
    
    // Get user location and initialize game
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const userPos = { lat: latitude, lng: longitude };
          
          // Update user location in stats
          if (stats) {
            setStats(prev => prev ? { ...prev, currentLocation: userPos } : null);
          }
          
          setHasStarted(true);
          
          // Check if we need to generate local levels
          const currentCheckpoints = checkpointsRef.current;
          const leafletModule = await import('leaflet');
          const L = leafletModule.default || leafletModule;
          const isDefaultLondon = currentCheckpoints.some(cp => cp.id === 'big-ben');
          
          if (currentCheckpoints.length === 0 || isDefaultLondon) {
            generateLocalLevels(userPos);
          }
        },
        (error) => {
          console.warn('Geolocation failed or denied:', error);
          // Start game anyway with default location
          setHasStarted(true);
          if (checkpointsRef.current.length === 0 && stats) {
            generateLocalLevels(stats.currentLocation);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // No geolocation support, start with default location
      setHasStarted(true);
      if (checkpointsRef.current.length === 0 && stats) {
        generateLocalLevels(stats.currentLocation);
      }
    }
  };

  // Weather system
  useEffect(() => {
    const cycleInterval = setInterval(() => {
      if (weather === 'sunny') {
        const types: WeatherType[] = ['rain', 'storm', 'snow', 'heatwave'];
        const nextWeather = types[Math.floor(Math.random() * types.length)];
        setWeather(nextWeather);
        setWeatherTimeLeft(WEATHER_CONFIG.duration);
      }
    }, WEATHER_CONFIG.cycleDuration * 1000);
    return () => clearInterval(cycleInterval);
  }, [weather]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (weather !== 'sunny' && weatherTimeLeft > 0) {
      interval = setInterval(() => {
        setWeatherTimeLeft(prev => {
          if (prev <= 1) {
            setWeather('sunny');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [weather, weatherTimeLeft]);

  useEffect(() => {
    let penaltyInterval: ReturnType<typeof setInterval> | undefined;
    if (weather !== 'sunny' && stats) {
      const config = WEATHER_CONFIG.types[weather];
      penaltyInterval = setInterval(() => {
        const currentStats = statsRef.current;
        if (!currentStats) return;
        const hasItem =
          config.requiredItem && currentStats.inventory && currentStats.inventory.includes(config.requiredItem);
        if (!hasItem) {
          setStats(prev => {
            if (!prev) return prev;
            const newValue = Math.max(0, prev.availableSteps - WEATHER_CONFIG.penaltyAmount);
            if (newValue === 0 && prev.availableSteps > 0) setShowOutOfStepsModal(true);
            return {
              ...prev,
              availableSteps: newValue,
            };
          });
        }
      }, WEATHER_CONFIG.penaltyInterval);
    }
    return () => clearInterval(penaltyInterval);
  }, [weather, stats]);

  // Speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          setInputText(transcript);
        }
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Real pedometer using device motion sensors
  useEffect(() => {
    if (typeof window === 'undefined' || !hasStarted) return;

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let stepCount = 0;
    let lastStepTime = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;
      
      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      // Calculate total acceleration magnitude
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const currentTime = Date.now();

      // Detect step: significant acceleration (> 10.8) + minimum time interval (300ms)
      if (magnitude > 10.8 && currentTime - lastStepTime > 300) {
        stepCount++;
        lastStepTime = currentTime;
        setPedometerSteps(stepCount);

        // Visual feedback
        setStepDetected(true);
        setTimeout(() => setStepDetected(false), 300);

        // Add 1 step immediately
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalSteps: prev.totalSteps + 1,
            availableSteps: prev.availableSteps + 1,
          };
        });
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [hasStarted]);

  const generateLocalLevels = async (center: LatLng) => {
    setIsGeneratingWorld(true);
    const typesToGenerate: CheckpointType[] = ['chat', 'chat', 'chat', 'challenge'];
    for (let i = typesToGenerate.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [typesToGenerate[i], typesToGenerate[j]] = [typesToGenerate[j], typesToGenerate[i]];
    }
    try {
      const promises = typesToGenerate.map(async (type, index) => {
        const sectorSize = 360 / 4;
        const minAngle = index * sectorSize + 15;
        const maxAngle = (index + 1) * sectorSize - 15;
        const bearing = Math.floor(Math.random() * (maxAngle - minAngle) + minAngle);
        const distance = 500 + Math.random() * 700;
        const loc = computeDestinationPoint(center, distance, bearing);
        const suggestion = await GeminiService.generateCheckpointSuggestion(loc.lat, loc.lng, type);
        return {
          id: `gen-${Date.now()}-${index}`,
          location: loc,
          name: suggestion.name || `Location ${index + 1}`,
          scenario: suggestion.scenario || 'Exploration',
          npcRole: suggestion.npcRole || 'Local Guide',
          dialogPrompt: suggestion.dialogPrompt || 'Welcome the traveler.',
          difficulty: suggestion.difficulty || 'beginner',
          type: suggestion.type || type,
          isUnlocked: true,
          isCompleted: false,
          image: `https://picsum.photos/400/300?random=${Date.now() + index}`,
          challengeConfig: suggestion.challengeConfig,
        } as Checkpoint;
      });
      const newCheckpoints = await Promise.all(promises);
      setCheckpoints(newCheckpoints);
    } catch (error) {
      console.error('Failed to generate world', error);
    } finally {
      setIsGeneratingWorld(false);
    }
  };

  const executeMove = useCallback(
    (target: LatLng, distanceMeters: number) => {
      if (!stats) return;
      
      // Round distance to nearest meter for consistency
      const actualDistance = Math.round(distanceMeters);
      
      setStats(prev => {
        if (!prev) return prev;
        
        // Calculate steps needed based on actual distance
        // 0.7 meters per step = ~1.43 steps per meter
        const stepsNeeded = Math.ceil(actualDistance / METERS_PER_STEP);
        
        console.log(`Move: ${actualDistance}m = ${stepsNeeded} steps (${METERS_PER_STEP}m/step)`);
        
        if (prev.availableSteps < stepsNeeded) {
          if (navigator.vibrate) navigator.vibrate(200);
          setShowOutOfStepsModal(true);
          return prev;
        }
        
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 500);
        
        const newAvailableSteps = prev.availableSteps - stepsNeeded;
        
        if (newAvailableSteps <= 0 && prev.availableSteps > 0) {
          setShowOutOfStepsModal(true);
        }
        
        return {
          ...prev,
          availableSteps: newAvailableSteps,
          traveledDistance: prev.traveledDistance + actualDistance,
          currentLocation: target,
        };
      });
    },
    [stats]
  );

  const handleJoystickMove = useCallback(
    (bearing: number, intensity: number) => {
      if (!stats) return;
      
      // Minimum threshold to avoid accidental micro-movements
      if (intensity < 0.15) {
        setPreviewLocation(null);
        setPlannedDistance(0);
        return;
      }
      
      // Calculate distance with better curve: slower start, faster at full drag
      // Using quadratic curve for more intuitive feel
      const normalizedIntensity = Math.max(0, Math.min(1, intensity));
      const dist = normalizedIntensity * normalizedIntensity * MAX_DRAG_DISTANCE;
      
      const dest = computeDestinationPoint(stats.currentLocation, dist, bearing);
      setPlannedDistance(dist);
      setPreviewLocation(dest);
    },
    [stats]
  );

  const handleJoystickStop = useCallback(() => {
    setPreviewLocation(loc => {
      if (loc) {
        setPlannedDistance(dist => {
          // Only execute move if distance is meaningful (> 5 meters)
          // This prevents accidental small movements from consuming steps
          if (dist > 5) {
            executeMove(loc, dist);
          }
          return 0;
        });
      }
      return null;
    });
  }, [executeMove]);

  const openDialog = useCallback(
    async (cp: Checkpoint) => {
      if (!stats) return;
      // Dynamically import Leaflet only on client side
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;
      const userLatLng = L.latLng(stats.currentLocation.lat, stats.currentLocation.lng);
      const cpLatLng = L.latLng(cp.location.lat, cp.location.lng);
      if (userLatLng.distanceTo(cpLatLng) > INTERACTION_RADIUS_METERS) {
        setToast({ message: 'Too far! Get closer to interact.', type: 'warning' });
        return;
      }
      if (cp.type === 'shop') {
        setActiveShop(cp);
        return;
      }
      setChallengeRound(0);
      setChallengeResult(null);
      setActiveDialog({ checkpoint: cp, messages: [] });
      setIsLoadingAI(true);
      const response = await GeminiService.generateDialogue(cp, []);
      setIsLoadingAI(false);
      setActiveDialog(prev =>
        prev
          ? {
              ...prev,
              messages: [
                {
                  id: 'init',
                  role: 'model',
                  text: response.text,
                  options: response.options,
                  timestamp: Date.now(),
                },
              ],
            }
          : null
      );
      if (autoPlayRef.current) {
        speakText(response.text);
      }
    },
    [stats]
  );

  const handleCheckpointClick = async (cp: Checkpoint) => {
    if (!stats) return;
    // Dynamically import Leaflet only on client side
    const leafletModule = await import('leaflet');
    const L = leafletModule.default || leafletModule;
    const dist = L.latLng(stats.currentLocation).distanceTo(L.latLng(cp.location));
    if (dist <= INTERACTION_RADIUS_METERS) openDialog(cp);
    else setToast({ message: `${cp.name} is too far.`, type: 'warning' });
  };

  const sendMessageImpl = async (text: string) => {
    if (!activeDialogRef.current || !text.trim()) return;
    const dialog = activeDialogRef.current;
    setInputText('');
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    const updatedMessages = [...dialog.messages, newUserMsg];
    setActiveDialog({ ...dialog, messages: updatedMessages });
    const isChallenge = dialog.checkpoint.type === 'challenge' || !!dialog.negotiatingItem;
    if (isChallenge) {
      setChallengeRound(prev => prev + 1);
    }
    setIsLoadingAI(true);
    try {
      const history = updatedMessages.map(m => ({ role: m.role, text: m.text }));
      const isStandardChallenge = dialog.checkpoint.type === 'challenge';
      const isNegotiation = !!dialog.negotiatingItem;
      const maxTurns = dialog.checkpoint.challengeConfig?.maxTurns || 5;
      const userMsgCount = updatedMessages.filter(m => m.role === 'user').length;
      
      // Handle negotiation dialog
      if (isNegotiation && userMsgCount >= 5) {
        const evaluation = await GeminiService.evaluateShoppingDeal(
          dialog.negotiatingItem!,
          history
        );
        
        if (evaluation.success) {
          const discountedPrice = Math.floor(dialog.negotiatingItem!.price * 0.5);
          if (!stats || stats.availableSteps < discountedPrice) {
            setChallengeResult({
              success: false,
              feedback: `Great negotiation! However, you need ${discountedPrice} steps to complete this purchase. (You have ${stats?.availableSteps || 0} steps)`,
            });
          } else {
            // Successful purchase with discount
            setStats(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                availableSteps: prev.availableSteps - discountedPrice,
                inventory: [...prev.inventory, dialog.negotiatingItem!.id],
              };
            });
            setChallengeResult({
              success: true,
              feedback: `Excellent negotiation! You purchased ${dialog.negotiatingItem!.name} for ${discountedPrice} steps (50% off!). It's now in your inventory.`,
            });
          }
        } else {
          setChallengeResult({
            success: false,
            feedback: evaluation.feedback || 'The shopkeeper wasn\'t convinced. Try being more polite and clear about your intent to buy.',
          });
        }
      } else if (isStandardChallenge && userMsgCount >= maxTurns) {
        const evaluation = await GeminiService.evaluateChallenge(dialog.checkpoint, history);
        setChallengeResult(evaluation);
        if (evaluation.success) {
          handleAddSteps(dialog.checkpoint.challengeConfig?.winReward || 0);
        } else {
          if (!stats) return;
          setStats(prev => {
            if (!prev) return prev;
            const newValue = Math.max(
              0,
              prev.availableSteps - (dialog.checkpoint.challengeConfig?.losePenalty || 0)
            );
            if (newValue === 0 && prev.availableSteps > 0) setShowOutOfStepsModal(true);
            return { ...prev, availableSteps: newValue };
          });
        }
      } else {
        const response = await GeminiService.generateDialogue(dialog.checkpoint, history);
        if (response.grammarCorrection) {
          const msgs = [...updatedMessages];
          msgs[msgs.length - 1].grammarCorrection = response.grammarCorrection;
          setActiveDialog({ ...dialog, messages: msgs });
        }
        const newAiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text,
          options: response.options,
          timestamp: Date.now(),
        };
        setActiveDialog(prev =>
          prev ? { ...prev, messages: [...prev.messages, newAiMsg] } : null
        );
        if (autoPlayRef.current) {
          speakText(response.text);
        }
      }
      if (stats) {
        setStats(prev =>
          prev
            ? {
                ...prev,
                learnedWords: prev.learnedWords + Math.floor(text.split(' ').length / 2),
              }
            : null
        );
      }
    } catch (e) {
      console.error('Failed to generate response', e);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleCloseDialog = () => {
    const dialog = activeDialogRef.current;
    if (dialog && dialog.messages.length > 1) {
      const record: EventRecord = {
        id: Date.now().toString(),
        checkpointId: dialog.checkpoint.id,
        checkpointName: dialog.checkpoint.name,
        checkpointImage: dialog.checkpoint.image,
        npcRole: dialog.checkpoint.npcRole,
        type: dialog.checkpoint.type || 'chat',
        timestamp: Date.now(),
        messages: dialog.messages,
        challengeResult: challengeResult
          ? {
              score: challengeResult.score || 0,
              success: challengeResult.success,
            }
          : undefined,
      };
      storageService.addHistoryItem(record);
      setHistory(prev => [record, ...prev]);
      
      // Mark checkpoint as completed if it was a meaningful interaction
      setCheckpoints(prev => prev.map(cp => 
        cp.id === dialog.checkpoint.id 
          ? { ...cp, isCompleted: true }
          : cp
      ));
      
      // Update stats for completed dialogues
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          completedDialogues: prev.completedDialogues + 1,
        };
      });
    }
    setActiveDialog(null);
    setChallengeResult(null);
  };

  const speakText = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      setToast({ message: 'Speech recognition not supported on this device.', type: 'error' });
    }
  };

  const handleAddSteps = (amount: number) => {
    if (!stats) return;
    setStats(prev =>
      prev
        ? {
            ...prev,
            totalSteps: prev.totalSteps + amount,
            availableSteps: prev.availableSteps + amount,
          }
        : null
    );
  };

  const handleShare = async () => {
    handleAddSteps(500);
    setShowOutOfStepsModal(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'StepTrek',
          text: 'Join me in learning English while walking!',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      setToast({ message: 'Link copied to clipboard! (+500 steps reward)', type: 'success' });
    }
  };

  const WeatherIcon = ({ type }: { type: WeatherType }) => {
    switch (type) {
      case 'rain':
        return <CloudRain className="w-4 h-4 text-blue-300" />;
      case 'storm':
        return <CloudLightning className="w-4 h-4 text-yellow-300" />;
      case 'snow':
        return <Snowflake className="w-4 h-4 text-white" />;
      case 'heatwave':
        return <Flame className="w-4 h-4 text-orange-500" />;
      default:
        return <Sun className="w-4 h-4 text-orange-500" />;
    }
  };

  if (!stats) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // Start screen - shown before the game begins
  if (!hasStarted) {
    return (
      <div className="absolute inset-0 z-[200] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex flex-col items-center justify-center p-8 text-white overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          {/* App icon */}
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[32px] flex items-center justify-center mb-8 shadow-2xl border border-white/20">
            <Footprints className="w-12 h-12 text-blue-300" />
          </div>
          
          {/* App name and tagline */}
          <h1 className="text-5xl font-black mb-4 tracking-tight drop-shadow-lg">
            StepTrek
          </h1>
          <p className="text-blue-100/80 text-lg mb-12 leading-relaxed font-medium">
            Language mastery at every step
          </p>
          
          {/* Start button */}
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={handleStartGame}
              className="w-full bg-white text-blue-700 py-5 px-8 rounded-[24px] font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <Activity className="w-6 h-6 group-hover:animate-pulse" />
              Start Exploring
            </button>
            
            {/* Info text */}
            <p className="text-blue-100/60 text-xs mt-4 px-4">
              Walk in the real world to earn steps and learn English through immersive conversations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] relative bg-gray-100 overflow-hidden font-sans">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Selection Toolbar */}
      {selectionPopup && (
        <SelectionToolbar
          x={selectionPopup.x}
          y={selectionPopup.y}
          selectedText={selectionPopup.text}
          onTranslate={handleTranslateSelection}
          onAddToFlashcard={handleAddToFlashcard}
          onClose={() => setSelectionPopup(null)}
        />
      )}
      
      {weather !== 'sunny' && (
        <div
          className={`absolute inset-0 pointer-events-none z-[5] overflow-hidden opacity-30 mix-blend-multiply ${
            weather === 'rain'
              ? 'bg-slate-900'
              : weather === 'storm'
                ? 'bg-indigo-900'
                : weather === 'snow'
                  ? 'bg-slate-200 opacity-50'
                  : 'bg-orange-500 opacity-10'
          }`}
        >
          {weather === 'rain' && (
            <div className="w-full h-full bg-[url('https://raw.githubusercontent.com/sfatihk/rain.js/master/examples/simple/img/rain.png')] animate-[slide-down_0.5s_linear_infinite]" />
          )}
          {weather === 'storm' && (
            <>
              <div className="w-full h-full bg-[url('https://raw.githubusercontent.com/sfatihk/rain.js/master/examples/simple/img/rain.png')] animate-[slide-down_0.2s_linear_infinite]" />
              <div
                className="absolute inset-0 bg-white opacity-0 animate-pulse"
                style={{ animationDuration: '3s' }}
              />
            </>
          )}
          {weather === 'snow' && (
            <div
              className="w-full h-full bg-[url('https://library.kissclipart.com/20180830/elw/kissclipart-falling-snow-png-clipart-snow-clip-art-7f0535c52c93390c.png')] bg-repeat animate-[slide-down_5s_linear_infinite]"
              style={{ backgroundSize: '300px' }}
            />
          )}
        </div>
      )}

      <Map
        userLocation={stats.currentLocation}
        userAvatar={stats.avatarImage}
        checkpoints={checkpoints}
        previewLocation={previewLocation}
        onCheckpointClick={handleCheckpointClick}
        onMapClick={latlng => {
          if (isAddingLocation) {
            // Immediately show the editor modal for instant feedback
            setEditorTarget({
              id: Date.now().toString(),
              location: latlng,
              name: '',
              npcRole: '',
              difficulty: 'beginner',
              type: 'chat',
              scenario: '',
              dialogPrompt: '',
              isUnlocked: true,
              isCompleted: false,
              image: 'https://picsum.photos/400/300',
              challengeConfig: {
                maxTurns: 5,
                targetScore: 80,
                winReward: 100,
                losePenalty: 100,
                goalDescription: '',
              },
            });
            
            // Fetch nearby places asynchronously in the background
            // This won't block the UI from showing the modal
            (async () => {
              setIsLoadingPlaces(true);
              try {
                const places = await placeService.getAllNearby(latlng.lat, latlng.lng, 200, 10);
                setNearbyPlaces(places);
                setShowPlaceSelector(places.length > 0);
                if (places.length === 0) {
                  setToast({ 
                    message: 'No nearby places found. You can still create a custom checkpoint.', 
                    type: 'info' 
                  });
                }
              } catch (error) {
                console.error('Failed to fetch nearby places:', error);
                setNearbyPlaces([]);
                setShowPlaceSelector(false);
                // Show user-friendly error message
                const errorMessage = error instanceof Error ? error.message : 'Failed to load nearby places';
                if (errorMessage.includes('timeout') || errorMessage.includes('504')) {
                  setToast({ 
                    message: 'Place search timed out. You can still create a custom checkpoint manually.', 
                    type: 'warning' 
                  });
                } else {
                  setToast({ 
                    message: 'Unable to load nearby places. You can still create a custom checkpoint.', 
                    type: 'warning' 
                  });
                }
              } finally {
                setIsLoadingPlaces(false);
              }
            })();
          }
        }}
        isMoving={isMoving}
        isAddingLocation={isAddingLocation}
        mapStyle={mapStyle}
      />

      {isGeneratingWorld && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-max">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-purple-100">
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            <span className="text-xs font-bold text-purple-800">Generating local world...</span>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full p-3 pointer-events-none z-10">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start w-full">
            <div className="flex gap-2 pointer-events-auto overflow-x-auto pb-1 scrollbar-hide max-w-[70%]">
              <div
                className={`backdrop-blur-md p-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 transition-all shrink-0 ${
                  stepDetected 
                    ? 'bg-brand-100 scale-105 border-brand-200' 
                    : stats.availableSteps <= 10 
                      ? 'bg-red-50 border-red-200 animate-pulse' 
                      : 'bg-white/90'
                }`}
              >
                <div
                  className={`p-1.5 rounded-full transition-all ${
                    stepDetected 
                      ? 'bg-brand-500 text-white' 
                      : stats.availableSteps <= 10 
                        ? 'bg-red-100' 
                        : 'bg-brand-100'
                  }`}
                >
                  <Footprints
                    className={`w-3.5 h-3.5 ${
                      stepDetected 
                        ? 'text-white' 
                        : stats.availableSteps <= 10 
                          ? 'text-red-600' 
                          : 'text-brand-600'
                    }`}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      stats.availableSteps <= 10 ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    Steps
                  </span>
                  <span
                    className={`text-base font-black leading-none ${
                      stats.availableSteps <= 10 ? 'text-red-700' : 'text-gray-800'
                    }`}
                  >
                    {stats.availableSteps}
                  </span>
                </div>
              </div>

              <div
                className={`backdrop-blur-md p-2 rounded-xl shadow-lg border transition-colors flex items-center gap-2 shrink-0 ${
                  weather !== 'sunny'
                    ? 'bg-slate-800/90 border-slate-700 text-white'
                    : 'bg-white/90 border-gray-100 text-gray-800'
                }`}
              >
                <div className={`p-1.5 rounded-full ${weather !== 'sunny' ? 'bg-slate-700' : 'bg-orange-100'}`}>
                  <WeatherIcon type={weather} />
                </div>
                <div className="flex flex-col min-w-[40px]">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      weather !== 'sunny' ? 'text-slate-400' : 'text-gray-500'
                    }`}
                  >
                    Sky
                  </span>
                  {weather !== 'sunny' ? (
                    <span className="text-base font-black text-blue-300 leading-none tabular-nums">
                      {weatherTimeLeft}s
                    </span>
                  ) : (
                    <span className="text-xs font-bold leading-none">Sunny</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => setShowHistoryLog(true)}
                className="bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-purple-50 transition-colors"
              >
                <History className="w-5 h-5 text-purple-600" />
              </button>
              <button
                onClick={() => setShowFlashcardDeck(true)}
                className="bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-yellow-50 transition-colors relative"
              >
                <BookOpen className="w-5 h-5 text-yellow-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm border border-white">
                  {flashcards.length}
                </span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 w-full z-30 pointer-events-none flex flex-col items-center justify-end h-48">
        {plannedDistance > 0 && (
          <div className="mb-2 bg-black/70 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full shadow-md pointer-events-auto animate-in fade-in slide-in-from-bottom-2">
            Walk {Math.round(plannedDistance)}m
          </div>
        )}

        <div className="w-full relative flex items-end justify-center px-6 pb-2">
          <div className="flex-1"></div>
          <div className="pointer-events-auto mx-4 relative">
            <Joystick
              onMove={handleJoystickMove}
              onStop={handleJoystickStop}
              disabled={isAddingLocation || activeDialog !== null || showOutOfStepsModal}
            />
          </div>
          <div className="flex-1 flex flex-col gap-3 items-end pointer-events-auto">
            <button
              onClick={() => setIsAddingLocation(!isAddingLocation)}
              className={`p-3.5 rounded-full shadow-lg transition-transform active:scale-95 ${
                isAddingLocation ? 'bg-red-500 text-white' : 'bg-white text-gray-700'
              }`}
            >
              {isAddingLocation ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
            <button
              onClick={() => handleAddSteps(1000)}
              className="bg-brand-500 hover:bg-brand-600 text-white p-3.5 rounded-full shadow-lg transition-transform active:scale-95"
            >
              <Footprints className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {showOutOfStepsModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-orange-500" />
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Out of Energy!</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              You've used all your steps. Walk in the real world to recharge!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowOutOfStepsModal(false)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Footprints className="w-5 h-5" />
                I'll Go for a Walk
              </button>
              <button
                onClick={handleShare}
                className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share & Get +500
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-[#fcfbf9]/90 w-full max-w-md h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative backdrop-blur-2xl border border-white/50">
            {challengeResult && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                    challengeResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {challengeResult.success ? <Award className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-800">
                  {challengeResult.success ? 'Success!' : 'Failed'}
                </h2>
                <p className="text-gray-500 mb-6">{challengeResult.feedback}</p>
                <button
                  onClick={handleCloseDialog}
                  className="px-8 py-3 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                >
                  Close
                </button>
              </div>
            )}
            <div className="absolute top-0 left-0 right-0 z-20 p-5 flex justify-between items-start bg-gradient-to-b from-[#fcfbf9] via-[#fcfbf9]/95 to-transparent pb-8 pointer-events-none">
              <div className="bg-white/80 backdrop-blur-md rounded-full p-2 pr-6 flex items-center gap-4 shadow-sm border border-black/5 pointer-events-auto transition-all hover:scale-[1.02]">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                  <img src={activeDialog.checkpoint.image} className="w-full h-full object-cover" alt="Avatar" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-bold text-base text-gray-800 leading-tight">
                    {activeDialog.checkpoint.npcRole}
                  </span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
                    {activeDialog.checkpoint.name}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pointer-events-auto pt-1">
                <button
                  onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border border-black/5 ${
                    autoPlayAudio ? 'bg-brand-50 text-brand-600' : 'bg-white/80 text-gray-400 hover:bg-white'
                  }`}
                >
                  {autoPlayAudio ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleCloseDialog}
                  className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm border border-black/5 text-gray-400 hover:text-gray-800 hover:bg-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-5 pt-32 pb-32 space-y-6 scrollbar-hide"
            >
              {activeDialog.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  {msg.role === 'model' && (
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 mt-auto mb-1 border border-gray-100">
                      <Bot className="w-6 h-6 text-brand-600" />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[80%] group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`py-3 px-5 text-[15px] leading-relaxed shadow-sm backdrop-blur-sm ${
                        msg.role === 'user'
                          ? 'bg-gray-900 text-white rounded-[20px] rounded-br-sm'
                          : 'bg-white/80 text-gray-800 rounded-[20px] rounded-bl-sm border border-white/50'
                      }`}
                      onMouseUp={msg.role === 'model' ? handleTextSelection : undefined}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <div
                      className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                        msg.role === 'user' ? 'mr-1' : 'ml-1'
                      }`}
                    >
                      <button
                        onClick={e => speakText(msg.text, e)}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-all"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      {msg.role === 'model' && !msg.translation && (
                        <button
                          onClick={async () => {
                            if (translatingMessageId) return; // Prevent multiple clicks
                            setTranslatingMessageId(msg.id);
                            try {
                            const translation = await GeminiService.translateText(msg.text);
                            setActiveDialog(prev =>
                              prev
                                ? {
                                    ...prev,
                                    messages: prev.messages.map(m =>
                                      m.id === msg.id ? { ...m, translation } : m
                                    ),
                                  }
                                : null
                            );
                            } catch (error: any) {
                              console.error('Translation error:', error);
                              // Show error in translation field
                              setActiveDialog(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      messages: prev.messages.map(m =>
                                        m.id === msg.id
                                          ? {
                                              ...m,
                                              translation: error?.message || '翻译失败，请稍后重试',
                                            }
                                          : m
                                      ),
                                    }
                                  : null
                              );
                            } finally {
                              setTranslatingMessageId(null);
                            }
                          }}
                          disabled={translatingMessageId === msg.id}
                          className={`p-1.5 rounded-full transition-all ${
                            translatingMessageId === msg.id
                              ? 'text-blue-600 bg-blue-50 cursor-wait'
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="翻译"
                        >
                          {translatingMessageId === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                          <Languages className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      {msg.role === 'user' && !msg.optimization && (
                        <button
                          onClick={async () => {
                            if (optimizingMessageId) return; // Prevent multiple clicks
                            setOptimizingMessageId(msg.id);
                            try {
                            const optimization = await GeminiService.optimizeText(msg.text);
                            setActiveDialog(prev =>
                              prev
                                ? {
                                    ...prev,
                                    messages: prev.messages.map(m =>
                                      m.id === msg.id ? { ...m, optimization } : m
                                    ),
                                  }
                                : null
                            );
                            } catch (error: any) {
                              console.error('Optimization error:', error);
                              // Show error in optimization field
                              setActiveDialog(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      messages: prev.messages.map(m =>
                                        m.id === msg.id
                                          ? {
                                              ...m,
                                              optimization: error?.message || '优化失败，请稍后重试',
                                            }
                                          : m
                                      ),
                                    }
                                  : null
                              );
                            } finally {
                              setOptimizingMessageId(null);
                            }
                          }}
                          disabled={optimizingMessageId === msg.id}
                          className={`p-1.5 rounded-full transition-all ${
                            optimizingMessageId === msg.id
                              ? 'text-purple-600 bg-purple-50 cursor-wait'
                              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title="优化表达"
                        >
                          {optimizingMessageId === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    {msg.translation && (
                      <div
                        className={`mt-2 w-full backdrop-blur-sm border rounded-2xl p-3 shadow-sm ${
                          msg.translation.includes('失败') || msg.translation.includes('不可用')
                            ? 'bg-red-50/80 border-red-200'
                            : 'bg-blue-50/80 border-blue-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Globe
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              msg.translation.includes('失败') || msg.translation.includes('不可用')
                                ? 'text-red-500'
                                : 'text-blue-500'
                            }`}
                          />
                          <div
                            className={`text-sm font-medium ${
                              msg.translation.includes('失败') || msg.translation.includes('不可用')
                                ? 'text-red-700'
                                : 'text-gray-700'
                            }`}
                          >
                            {msg.translation}
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.optimization && (
                      <div
                        className={`mt-2 w-full backdrop-blur-sm border rounded-2xl p-3 shadow-sm ${
                          msg.optimization.includes('失败') || msg.optimization.includes('不可用')
                            ? 'bg-red-50/80 border-red-200'
                            : 'bg-purple-50/80 border-purple-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Sparkles
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              msg.optimization.includes('失败') || msg.optimization.includes('不可用')
                                ? 'text-red-500'
                                : 'text-purple-500'
                            }`}
                          />
                          <div>
                            {msg.optimization.includes('失败') || msg.optimization.includes('不可用') ? (
                              <p className="text-sm text-red-700 font-medium">{msg.optimization}</p>
                            ) : (
                              <>
                            <p className="text-xs text-purple-700 font-bold mb-1 uppercase tracking-wide">
                              Better phrasing
                            </p>
                            <p className="text-sm text-gray-800 font-medium">"{msg.optimization}"</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoadingAI && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-gray-100">
                    <Bot className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm px-4 py-3 rounded-[20px] rounded-bl-sm border border-white/50 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 bg-gradient-to-t from-[#fcfbf9] via-[#fcfbf9] to-transparent pt-10">
              {activeDialog.messages.length > 0 &&
                activeDialog.messages[activeDialog.messages.length - 1]?.role === 'model' &&
                activeDialog.messages[activeDialog.messages.length - 1]?.options && (
                  <div className="mb-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                    {activeDialog.messages[activeDialog.messages.length - 1].options!.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessageImpl(opt)}
                        className="whitespace-nowrap text-xs font-medium bg-white/80 backdrop-blur-md text-gray-700 border border-gray-200/50 px-4 py-2 rounded-full hover:bg-white hover:shadow-md hover:scale-105 transition-all shadow-sm"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              <div className="bg-white p-1.5 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center gap-2 relative transition-transform focus-within:scale-[1.02]">
                <button
                  onClick={isListening ? () => {} : handleStartListening}
                  className={`p-3 rounded-full transition-all ${
                    isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base text-gray-800 placeholder-gray-400 font-medium p-2"
                  placeholder={isListening ? 'Listening...' : 'Ask...'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (inputText.trim()) {
                        sendMessageImpl(inputText);
                      }
                    }
                  }}
                />
                <button
                  onClick={() => inputText.trim() && sendMessageImpl(inputText)}
                  disabled={!inputText.trim()}
                  className={`px-5 py-3 rounded-[22px] font-bold text-sm transition-all flex items-center gap-1 ${
                    inputText.trim()
                      ? 'bg-gray-900 text-white hover:bg-black hover:shadow-lg active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Go 
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {activeShop && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setActiveShop(null)}
        >
          <div 
            className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-4 bg-white border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-gray-700" />
    </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {activeShop.npcRole}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {activeShop.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveShop(null)}
                  className="w-10 h-10 rounded-full bg-white shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Shop Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-white">

              {activeShop.shopConfig?.items.map(item => {
                const IconComponent = item.icon === 'Umbrella' ? Umbrella :
                  item.icon === 'CloudLightning' ? CloudLightning :
                  item.icon === 'Snowflake' ? Snowflake :
                  item.icon === 'Flame' ? Flame : ShoppingBag;
                
                const isOwned = stats?.inventory.includes(item.id);
                const weatherLabel = item.requiredFor ? 
                  WEATHER_CONFIG.types[item.requiredFor]?.label : '';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg p-3 border transition-all ${
                      isOwned 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOwned 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isOwned ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <IconComponent className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {item.name}
                          </h3>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-sm font-bold ${
                              isOwned ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {isOwned ? 'Owned' : `${item.price} steps`}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                          {item.description}
                        </p>
                        {weatherLabel && (
                          <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-medium mb-2">
                            Protects from {weatherLabel}
                          </div>
                        )}
                        {!isOwned && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                if (!stats || stats.availableSteps < item.price) {
                                  setToast({ message: 'Not enough steps!', type: 'error' });
                                  return;
                                }
                                // Direct purchase
                                setStats(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    availableSteps: prev.availableSteps - item.price,
                                    inventory: [...prev.inventory, item.id],
                                  };
                                });
                              }}
                              className="flex-1 bg-black text-white py-2 px-3 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
                            >
                              Buy Now
                            </button>
                            <button
                              onClick={() => {
                                // Start negotiation dialog
                                setActiveShop(null);
                                setActiveDialog({
                                  checkpoint: activeShop,
                                  messages: [],
                                  negotiatingItem: item,
                                });
                                setIsLoadingAI(true);
                                GeminiService.generateDialogue(activeShop, []).then(response => {
                                  setIsLoadingAI(false);
                                  setActiveDialog(prev =>
                                    prev
                                      ? {
                                          ...prev,
                                          messages: [
                                            {
                                              id: 'init',
                                              role: 'model',
                                              text: response.text,
                                              options: response.options,
                                              timestamp: Date.now(),
                                            },
                                          ],
                                        }
                                      : null
                                  );
                                  if (autoPlayRef.current) {
                                    speakText(response.text);
                                  }
                                });
                              }}
                              className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors relative"
                            >
                              <span>Negotiate</span>
                              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                50% OFF
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Inventory Summary */}
              {stats?.inventory && stats.inventory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Your Inventory
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.inventory.map(itemId => {
                      const item = activeShop.shopConfig?.items.find(i => i.id === itemId);
                      return item ? (
                        <span
                          key={itemId}
                          className="bg-white px-2 py-1 rounded text-[10px] font-medium text-gray-700 border border-gray-200"
                        >
                          {item.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Editor Modal */}
      {editorTarget && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            setEditorTarget(null);
            setIsAddingLocation(false);
          }}
        >
          <div 
            className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative animate-slide-up-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-4 bg-white border-b border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {editorTarget.id ? 'Edit Checkpoint' : 'New Checkpoint'}
                    </h2>
                    <p className="text-xs text-gray-500 font-mono">
                      {editorTarget.location?.lat.toFixed(4)}, {editorTarget.location?.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditorTarget(null);
                    setIsAddingLocation(false);
                  }}
                  className="w-10 h-10 rounded-full bg-white shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* AI Generate Button */}
              <button
                onClick={async () => {
                  if (!editorTarget.location) return;
                  setIsGeneratingSuggestion(true);
                  try {
                    const suggestion = await GeminiService.generateCheckpointSuggestion(
                      editorTarget.location.lat,
                      editorTarget.location.lng,
                      editorTarget.type || 'chat'
                    );
                    setEditorTarget(prev => ({
                      ...prev,
                      name: prev?.name || suggestion.name,
                      npcRole: prev?.npcRole || suggestion.npcRole,
                      scenario: prev?.scenario || suggestion.scenario,
                      dialogPrompt: prev?.dialogPrompt || suggestion.dialogPrompt,
                      difficulty: prev?.difficulty || suggestion.difficulty,
                    }));
                  } catch (error) {
                    console.error('Failed to generate suggestion:', error);
                  } finally {
                    setIsGeneratingSuggestion(false);
                  }
                }}
                disabled={isGeneratingSuggestion}
                className="w-full bg-black text-white rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingSuggestion ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-generate with AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-white">
              {/* Nearby Places Selector */}
              {isLoadingPlaces && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs text-blue-700">Searching for nearby places...</span>
                </div>
              )}
              
              {showPlaceSelector && nearbyPlaces.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPinned className="w-4 h-4 text-gray-600" />
                      <h3 className="text-xs font-semibold text-gray-900">
                        Nearby Places ({nearbyPlaces.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowPlaceSelector(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Click to use a real place from OpenStreetMap
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {nearbyPlaces.map(place => (
                      <button
                        key={place.id}
                        onClick={() => {
                          setEditorTarget(prev => ({
                            ...prev,
                            name: place.name,
                            scenario: `${place.type} visit`,
                          }));
                          setShowPlaceSelector(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {place.name}
                            </div>
                            {place.address && (
                              <div className="text-[10px] text-gray-500 truncate">
                                {place.address}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded font-medium flex-shrink-0">
                            {place.type}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Checkpoint Name *
                  </label>
                  <input
                    type="text"
                    value={editorTarget.name || ''}
                    onChange={e => setEditorTarget({ ...editorTarget, name: e.target.value })}
                    placeholder="e.g., Coffee Shop"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    NPC Role *
                  </label>
                  <input
                    type="text"
                    value={editorTarget.npcRole || ''}
                    onChange={e => setEditorTarget({ ...editorTarget, npcRole: e.target.value })}
                    placeholder="e.g., Barista Emma"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Scenario *
                  </label>
                  <input
                    type="text"
                    value={editorTarget.scenario || ''}
                    onChange={e => setEditorTarget({ ...editorTarget, scenario: e.target.value })}
                    placeholder="e.g., Ordering coffee"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Difficulty Level *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['basic', 'beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(level => {
                      const config = DIFFICULTY_CONFIG[level];
                      return (
                        <button
                          key={level}
                          onClick={() => setEditorTarget({ ...editorTarget, difficulty: level })}
                          className={`p-2.5 rounded-lg border transition-all text-left ${
                            editorTarget.difficulty === level
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-bold ${config.colors.text}`}>{config.label}</span>
                            <span className="text-[10px] font-semibold text-gray-400">{config.cefr}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-tight">{config.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['chat', 'challenge', 'shop'] as CheckpointType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setEditorTarget({ ...editorTarget, type })}
                        className={`p-2.5 rounded-lg border transition-all ${
                          editorTarget.type === type
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          {type === 'chat' && <MessageSquare className="w-4 h-4 mx-auto mb-1 text-gray-700" />}
                          {type === 'challenge' && <Target className="w-4 h-4 mx-auto mb-1 text-gray-700" />}
                          {type === 'shop' && <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-gray-700" />}
                          <span className="text-[11px] font-semibold text-gray-700 capitalize">{type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Dialog Prompt (for AI) *
                  </label>
                  <textarea
                    value={editorTarget.dialogPrompt || ''}
                    onChange={e => setEditorTarget({ ...editorTarget, dialogPrompt: e.target.value })}
                    placeholder="Instructions for the AI character..."
                    rows={4}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                {/* Challenge Config */}
                {editorTarget.type === 'challenge' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Challenge Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Max Turns</label>
                        <input
                          type="number"
                          value={editorTarget.challengeConfig?.maxTurns || 5}
                          onChange={e => setEditorTarget({
                            ...editorTarget,
                            challengeConfig: {
                              ...editorTarget.challengeConfig,
                              maxTurns: parseInt(e.target.value) || 5,
                              targetScore: editorTarget.challengeConfig?.targetScore || 80,
                              winReward: editorTarget.challengeConfig?.winReward || 100,
                              losePenalty: editorTarget.challengeConfig?.losePenalty || 100,
                              goalDescription: editorTarget.challengeConfig?.goalDescription || '',
                            }
                          })}
                          className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Target Score</label>
                        <input
                          type="number"
                          value={editorTarget.challengeConfig?.targetScore || 80}
                          onChange={e => setEditorTarget({
                            ...editorTarget,
                            challengeConfig: {
                              ...editorTarget.challengeConfig!,
                              targetScore: parseInt(e.target.value) || 80,
                            }
                          })}
                          className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Win Reward</label>
                        <input
                          type="number"
                          value={editorTarget.challengeConfig?.winReward || 100}
                          onChange={e => setEditorTarget({
                            ...editorTarget,
                            challengeConfig: {
                              ...editorTarget.challengeConfig!,
                              winReward: parseInt(e.target.value) || 100,
                            }
                          })}
                          className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Lose Penalty</label>
                        <input
                          type="number"
                          value={editorTarget.challengeConfig?.losePenalty || 100}
                          onChange={e => setEditorTarget({
                            ...editorTarget,
                            challengeConfig: {
                              ...editorTarget.challengeConfig!,
                              losePenalty: parseInt(e.target.value) || 100,
                            }
                          })}
                          className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Goal Description</label>
                      <input
                        type="text"
                        value={editorTarget.challengeConfig?.goalDescription || ''}
                        onChange={e => setEditorTarget({
                          ...editorTarget,
                          challengeConfig: {
                            ...editorTarget.challengeConfig!,
                            goalDescription: e.target.value,
                          }
                        })}
                        placeholder="e.g., Pass the interview"
                        className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="sticky bottom-0 bg-white pt-3 pb-1">
                <button
                  onClick={() => {
                    if (!editorTarget.name || !editorTarget.npcRole || !editorTarget.scenario || !editorTarget.dialogPrompt) {
                    setToast({ message: 'Please fill in all required fields (*)', type: 'warning' });
                    return;
                    }
                    
                    const newCheckpoint: Checkpoint = {
                      id: editorTarget.id || `custom-${Date.now()}`,
                      name: editorTarget.name,
                      type: editorTarget.type || 'chat',
                      location: editorTarget.location!,
                      difficulty: editorTarget.difficulty || 'beginner',
                      scenario: editorTarget.scenario,
                      npcRole: editorTarget.npcRole,
                      dialogPrompt: editorTarget.dialogPrompt,
                      image: editorTarget.image || `https://picsum.photos/400/300?random=${Date.now()}`,
                      isUnlocked: true,
                      isCompleted: false,
                      challengeConfig: editorTarget.challengeConfig,
                      shopConfig: editorTarget.shopConfig,
                    };

                    if (editorTarget.id) {
                      // Update existing
                      setCheckpoints(prev => prev.map(cp => cp.id === newCheckpoint.id ? newCheckpoint : cp));
                    } else {
                      // Add new
                      setCheckpoints(prev => [...prev, newCheckpoint]);
                    }

                    setEditorTarget(null);
                    setIsAddingLocation(false);
                  }}
                  className="w-full bg-black text-white py-3 px-4 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-all"
                >
                  Save Checkpoint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {showHistoryLog && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => {
            setShowHistoryLog(false);
            setSelectedHistoryItem(null);
          }}
        >
          <div 
            className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-4 bg-white border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-purple-100 flex items-center justify-center">
                    <History className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Conversation History
                    </h2>
                    <p className="text-xs text-gray-500">
                      {history.length} {history.length === 1 ? 'conversation' : 'conversations'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryLog(false);
                    setSelectedHistoryItem(null);
                  }}
                  className="w-10 h-10 rounded-full bg-white shadow-[0_1px_0_-1px_rgba(0,0,0,0.05),0_1px_1px_-1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Start exploring and chatting with NPCs to build your conversation history.
                  </p>
                </div>
              ) : selectedHistoryItem ? (
                /* Detail View */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to timeline
                  </button>
                  
                  {/* Conversation Details */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3 mb-4">
                      {selectedHistoryItem.checkpointImage && (
                        <img 
                          src={selectedHistoryItem.checkpointImage} 
                          alt={selectedHistoryItem.npcRole}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{selectedHistoryItem.checkpointName}</h3>
                        <p className="text-sm text-gray-600">{selectedHistoryItem.npcRole}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {selectedHistoryItem.type === 'challenge' && selectedHistoryItem.challengeResult && (
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          selectedHistoryItem.challengeResult.success 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedHistoryItem.challengeResult.success ? 'Passed' : 'Failed'}
                          {' '}({selectedHistoryItem.challengeResult.score}%)
                        </div>
                      )}
                    </div>
                    
                    {/* Messages */}
                    <div className="space-y-3">
                      {selectedHistoryItem.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              msg.role === 'user'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            {msg.translation && (
                              <p className="text-xs mt-1 opacity-70 border-t border-white/20 pt-1 mt-1">
                                {msg.translation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Timeline View */
                <div className="space-y-3">
                  {history.map((item, index) => {
                    const isLast = index === history.length - 1;
                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline line */}
                        {!isLast && (
                          <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        
                        <button
                          onClick={() => setSelectedHistoryItem(item)}
                          className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-200 hover:shadow-sm transition-all text-left group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                item.type === 'challenge' 
                                  ? 'bg-purple-100' 
                                  : item.type === 'shop'
                                    ? 'bg-orange-100'
                                    : 'bg-blue-100'
                              }`}>
                                {item.checkpointImage ? (
                                  <img 
                                    src={item.checkpointImage} 
                                    alt={item.npcRole}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  item.type === 'challenge' ? (
                                    <Target className="w-6 h-6 text-purple-600" />
                                  ) : item.type === 'shop' ? (
                                    <ShoppingBag className="w-6 h-6 text-orange-600" />
                                  ) : (
                                    <MessageSquare className="w-6 h-6 text-blue-600" />
                                  )
                                )}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-purple-600 transition-colors">
                                    {item.checkpointName}
                                  </h3>
                                  <p className="text-xs text-gray-600 truncate">{item.npcRole}</p>
                                </div>
                                {item.type === 'challenge' && item.challengeResult && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    item.challengeResult.success 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {item.challengeResult.success ? '✓' : '✗'} {item.challengeResult.score}%
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>{item.messages.length} messages</span>
                              </div>
                              
                              {/* Preview of last message */}
                              {item.messages.length > 0 && (
                                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                  {item.messages[item.messages.length - 1].text}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Deck Modal */}
      {showFlashcardDeck && (
        <FlashcardDeck
          flashcards={flashcards}
          onReview={handleReviewFlashcard}
          onClose={() => setShowFlashcardDeck(false)}
        />
      )}
    </div>
  );
}
