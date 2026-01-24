import { NextRequest, NextResponse } from 'next/server';
import { DoubaoProvider } from '@/lib/doubao/provider';
import { CEFRLevel } from '@/types';

// Export DoubaoProvider for use in this file
const DoubaoProviderStatic = DoubaoProvider;

// Initialize Doubao AI service (豆包 AI)
const doubaoApiKey = process.env.DOUBAO_API_KEY || process.env.NEXT_DOUBAO_API_KEY || process.env.NEXT_PUBLIC_DOUBAO_API_KEY || '';
const DOUBAO_CHAT_ENDPOINT = process.env.DOUBAO_CHAT_ENDPOINT || process.env.NEXT_DOUBAO_CHAT_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3';
const DOUBAO_MODEL = process.env.DOUBAO_CHAT_MODEL || process.env.NEXT_DOUBAO_CHAT_MODEL || process.env.NEXT_PUBLIC_DOUBAO_MODEL || 'doubao-seed-1-6-flash-250828';

// Create Doubao provider if configured
const doubao = doubaoApiKey && doubaoApiKey !== 'your_doubao_api_key_here'
  ? new DoubaoProvider({
      apiKey: doubaoApiKey,
      endpoint: DOUBAO_CHAT_ENDPOINT,
      model: DOUBAO_MODEL,
    })
  : null;

// Helper function to parse JSON from AI response
function parseJSONResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  }
}

// Generate text using Doubao AI (server-side)
async function generateTextWithDoubao(prompt: string): Promise<string> {
  if (!doubao || !doubaoApiKey) {
    throw new Error('Doubao AI is not configured. Please set DOUBAO_API_KEY environment variable.');
  }

  try {
    console.log('🤖 [YouTube Analysis] Attempting Doubao AI (豆包 AI)...');
    console.log('   Model:', DOUBAO_MODEL);
    console.log('   Endpoint:', DOUBAO_CHAT_ENDPOINT);
    const completion = await doubao.chat(
      [
        {
          role: 'system',
          content: 'You are an expert English learning content analyzer. Always respond with valid JSON when requested.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3 }
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from Doubao');
    
    console.log('✅ [YouTube Analysis] ✅ SUCCESS: Using Doubao AI (豆包 AI)');
    return text;
  } catch (error: any) {
    // Check for account/billing errors
    const errorMessage = error?.message || '';
    const isAccountError = errorMessage.includes('AccountOverdueError') || 
                          errorMessage.includes('403 Forbidden') ||
                          errorMessage.includes('overdue balance');
    
    if (isAccountError) {
      console.warn('⚠️ [YouTube Analysis] Doubao API account issue - will use fallback analysis');
      // Throw a specific error that will trigger fallback
      throw new Error('DOUBAO_ACCOUNT_ERROR');
    }
    
    console.error('❌ [YouTube Analysis] Doubao failed:', errorMessage);
    throw error;
  }
}

// CEFR Level to difficulty mapping
const CEFR_TO_DIFFICULTY = {
  A1: { wpm: 80, vocabLevel: 1, complexity: 1 },
  A2: { wpm: 110, vocabLevel: 2, complexity: 2 },
  B1: { wpm: 135, vocabLevel: 3, complexity: 3 },
  B2: { wpm: 150, vocabLevel: 4, complexity: 4 },
  C1: { wpm: 165, vocabLevel: 5, complexity: 5 },
  C2: { wpm: 180, vocabLevel: 6, complexity: 6 },
};

// Extract YouTube video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Analyze video difficulty using AI
async function analyzeSegmentDifficulty(
  transcript: string,
  duration: number,
  userLevel: string
): Promise<{
  cefrLevel: string;
  difficultyScore: number;
  vocabularyComplexity: number;
  speechRate: number;
  sentenceComplexity: number;
  pronunciationClarity: number;
  topics: string[];
  keywords: string[];
}> {
  const prompt = `Analyze this English video transcript segment and determine its difficulty level according to CEFR standards (A1, A2, B1, B2, C1, C2).

Transcript: "${transcript}"
Duration: ${duration} seconds
User's current level: ${userLevel}

Analyze and provide:
1. CEFR Level (A1/A2/B1/B2/C1/C2)
2. Difficulty Score (0-100, where 0=easiest, 100=hardest)
3. Vocabulary Complexity (0-100, based on CEFR vocabulary lists)
4. Speech Rate (words per minute - calculate from transcript and duration)
5. Sentence Complexity (0-100, based on clauses, tenses, sentence length)
6. Pronunciation Clarity (0-100, estimate based on transcript quality)
7. Main Topics (extract 2-3 key topics)
8. Key Vocabulary (extract 5-10 important words)

Respond in JSON format:
{
  "cefrLevel": "B1",
  "difficultyScore": 65,
  "vocabularyComplexity": 70,
  "speechRate": 135,
  "sentenceComplexity": 60,
  "pronunciationClarity": 85,
  "topics": ["work", "technology", "communication"],
  "keywords": ["meeting", "presentation", "discuss", "project", "deadline"]
}`;

  try {
    // Use Doubao AI for analysis
    console.log('🤖 [AI Analysis] Attempting to use Doubao AI (豆包 AI)...');
    const response = await generateTextWithDoubao(prompt);
    const parsed = DoubaoProvider.parseJSONResponse(response);
    console.log('✅ [AI Analysis] ✅ SUCCESS: Using Doubao AI (豆包 AI) for segment analysis');
    console.log('   📊 Analysis result:', {
      cefrLevel: parsed.cefrLevel,
      difficultyScore: parsed.difficultyScore,
      speechRate: parsed.speechRate,
      topics: parsed.topics?.slice(0, 3),
    });
    return parsed;
  } catch (error: any) {
    // Check if it's an account/billing error - use fallback immediately
    const isAccountError = error?.message === 'DOUBAO_ACCOUNT_ERROR' ||
                          error?.message?.includes('AccountOverdueError') || 
                          error?.message?.includes('403 Forbidden') ||
                          error?.message?.includes('overdue balance');
    
    if (isAccountError) {
      console.warn('⚠️ [AI Analysis] Doubao API account issue detected');
      console.log('🔄 [AI Analysis] ⚠️ FALLBACK: Using rule-based estimation (no AI)');
    } else {
      console.error('❌ [AI Analysis] Doubao AI failed:', error?.message || error);
      console.log('🔄 [AI Analysis] ⚠️ FALLBACK: Using rule-based estimation (no AI)');
    }
    
    // Fallback: estimate based on transcript length and duration
    const wordCount = transcript.split(/\s+/).length;
    const estimatedWpm = (wordCount / duration) * 60;
    
    // Improved fallback estimation
    let estimatedLevel: CEFRLevel = 'B1';
    if (estimatedWpm < 80) {
      estimatedLevel = 'A1';
    } else if (estimatedWpm < 110) {
      estimatedLevel = 'A2';
    } else if (estimatedWpm < 150) {
      estimatedLevel = 'B1';
    } else if (estimatedWpm < 180) {
      estimatedLevel = 'B2';
    } else {
      estimatedLevel = 'C1';
    }
    
    // Estimate difficulty based on word count and sentence complexity
    const avgWordsPerSentence = wordCount / Math.max((transcript.match(/[.!?]+/g) || []).length, 1);
    const difficultyScore = Math.min(100, Math.max(20, 
      (estimatedWpm / 2) + (avgWordsPerSentence * 5)
    ));
    
    // Extract simple keywords from transcript
    const words = transcript.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4)
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 10);
    
    const fallbackResult = {
      cefrLevel: estimatedLevel,
      difficultyScore: Math.round(difficultyScore),
      vocabularyComplexity: Math.round(difficultyScore * 0.8),
      speechRate: Math.round(estimatedWpm),
      sentenceComplexity: Math.round(Math.min(100, avgWordsPerSentence * 10)),
      pronunciationClarity: 70,
      topics: [], // Can't extract topics without AI
      keywords: words,
    };
    
    console.log('📊 [AI Analysis] Fallback estimation result:', {
      cefrLevel: fallbackResult.cefrLevel,
      difficultyScore: fallbackResult.difficultyScore,
      speechRate: fallbackResult.speechRate,
      method: 'rule-based (no AI)',
    });
    
    return fallbackResult;
  }
}

// Import YouTube transcript service
import { getYouTubeTranscript, getVideoInfo } from '@/lib/youtube/transcript';

// Get video transcript (real implementation)
async function getVideoTranscript(videoId: string): Promise<{ 
  segments: Array<{ start: number; end: number; text: string }>, 
  hasSubtitles: boolean;
  title: string;
  description: string;
}> {
  try {
    console.log(`🎬 Fetching real transcript for video: ${videoId}`);
    
    // 获取真实的字幕数据
    const transcriptData = await getYouTubeTranscript(videoId);
    const videoInfo = await getVideoInfo(videoId);
    
    if (!transcriptData.hasSubtitles || transcriptData.segments.length === 0) {
      console.warn('❌ No subtitles available for this video');
      return {
        segments: [],
        hasSubtitles: false,
        title: videoInfo.title,
        description: videoInfo.description,
      };
    }
    
    console.log(`✅ Successfully extracted ${transcriptData.segments.length} segments`);
    
    return {
      segments: transcriptData.segments,
      hasSubtitles: true,
      title: videoInfo.title,
      description: videoInfo.description,
    };
  } catch (error: any) {
    console.error('Failed to fetch transcript:', error);
    
    // 如果是字幕不可用错误，返回空数据而不是抛出异常
    if (error.message && (
      error.message.includes('Could not find') || 
      error.message.includes('No transcript') ||
      error.message.includes('Transcript is disabled')
    )) {
      console.warn('⚠️ Subtitles not available for this video');
      try {
        const videoInfo = await getVideoInfo(videoId);
        return {
          segments: [],
          hasSubtitles: false,
          title: videoInfo.title,
          description: videoInfo.description,
        };
      } catch {
        return {
          segments: [],
          hasSubtitles: false,
          title: 'YouTube Video',
          description: '',
        };
      }
    }
    
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, videoId, userLevel = 'B1', manualSubtitles } = await request.json();

    // Handle manual subtitle input
    if (manualSubtitles && manualSubtitles.trim()) {
      console.log('📝 Processing manual subtitles...');
      const { parseManualSubtitles, getVideoInfo } = await import('@/lib/youtube/transcript');
      
      const segments = parseManualSubtitles(manualSubtitles);
      
      if (segments.length === 0) {
        return NextResponse.json(
          { error: 'No valid segments found in the subtitle text. Please check the format.' },
          { status: 400 }
        );
      }

      // Analyze each segment
      const analyzedSegments = await Promise.all(
        segments.map(async (segment, index) => {
          try {
            const analysis = await analyzeSegmentDifficulty(
              segment.text,
              segment.duration,
              userLevel
            );

            return {
              id: `manual-segment-${index}`,
              startTime: segment.start,
              endTime: segment.end,
              duration: segment.duration,
              transcript: segment.text,
              subtitle: segment.text,
              ...analysis,
            };
          } catch (error) {
            console.error(`Failed to analyze segment ${index}:`, error);
            const wordCount = segment.text.split(/\s+/).length;
            const estimatedWpm = (wordCount / segment.duration) * 60;
            
            return {
              id: `manual-segment-${index}`,
              startTime: segment.start,
              endTime: segment.end,
              duration: segment.duration,
              transcript: segment.text,
              subtitle: segment.text,
              cefrLevel: estimatedWpm < 100 ? 'A1' : estimatedWpm < 120 ? 'A2' : estimatedWpm < 150 ? 'B1' : 'B2',
              difficultyScore: 50,
              vocabularyComplexity: 50,
              speechRate: Math.round(estimatedWpm),
              sentenceComplexity: 50,
              pronunciationClarity: 70,
              topics: [],
              keywords: [],
            };
          }
        })
      );

      // Filter segments to match user level
      const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const userLevelIndex = levelOrder.indexOf(userLevel);
      const matchingSegments = analyzedSegments.filter(segment => {
        const segmentLevelIndex = levelOrder.indexOf(segment.cefrLevel);
        return Math.abs(userLevelIndex - segmentLevelIndex) <= 1;
      });

      const totalDuration = analyzedSegments.length > 0
        ? Math.max(...analyzedSegments.map(s => s.endTime))
        : 0;

      return NextResponse.json({
        videoId: 'manual-input',
        videoUrl: videoUrl || 'Manual Input',
        title: 'Manual Subtitles',
        description: 'User-provided subtitles',
        duration: totalDuration,
        segments: matchingSegments,
        allSegments: analyzedSegments,
        hasSubtitles: true,
        analyzedAt: Date.now(),
      });
    }

    // Auto-extract from YouTube
    if (!videoUrl && !videoId) {
      return NextResponse.json(
        { error: 'Video URL, ID, or manual subtitles is required' },
        { status: 400 }
      );
    }

    const finalVideoId = videoId || extractVideoId(videoUrl);
    if (!finalVideoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Get video transcript (real implementation)
    console.log('📺 Getting real transcript data...');
    const transcriptData = await getVideoTranscript(finalVideoId);

    if (!transcriptData.hasSubtitles || transcriptData.segments.length === 0) {
      console.warn('⚠️ No subtitles available, returning empty result');
      return NextResponse.json({
        videoId: finalVideoId,
        videoUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
        title: transcriptData.title,
        description: transcriptData.description,
        duration: 0,
        segments: [],
        hasSubtitles: false,
        analyzedAt: Date.now(),
        error: 'This video does not have subtitles available. Please try another video with English subtitles.',
      });
    }

    console.log(`🔍 Analyzing ${transcriptData.segments.length} segments...`);

    // Analyze each segment with difficulty assessment
    const analyzedSegments = await Promise.all(
      transcriptData.segments.map(async (segment, index) => {
        try {
          const segmentDuration = segment.end - segment.start;
          const analysis = await analyzeSegmentDifficulty(
            segment.text,
            segmentDuration,
            userLevel
          );

          return {
            id: `${videoId}-segment-${index}`,
            startTime: segment.start,
            endTime: segment.end,
            duration: segmentDuration,
            transcript: segment.text,
            subtitle: segment.text,
            ...analysis,
          };
        } catch (error) {
          console.error(`Failed to analyze segment ${index}:`, error);
          // Return fallback analysis for this segment
          const segmentDuration = segment.end - segment.start;
          const wordCount = segment.text.split(/\s+/).length;
          const estimatedWpm = (wordCount / segmentDuration) * 60;
          
          return {
            id: `${videoId}-segment-${index}`,
            startTime: segment.start,
            endTime: segment.end,
            duration: segmentDuration,
            transcript: segment.text,
            subtitle: segment.text,
            cefrLevel: estimatedWpm < 100 ? 'A1' : estimatedWpm < 120 ? 'A2' : estimatedWpm < 150 ? 'B1' : 'B2',
            difficultyScore: 50,
            vocabularyComplexity: 50,
            speechRate: Math.round(estimatedWpm),
            sentenceComplexity: 50,
            pronunciationClarity: 70,
            topics: [],
            keywords: [],
          };
        }
      })
    );

    console.log(`✅ Analysis complete for ${analyzedSegments.length} segments`);

    // Filter segments to match user level (±1 level tolerance)
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const userLevelIndex = levelOrder.indexOf(userLevel);
    const matchingSegments = analyzedSegments.filter(segment => {
      const segmentLevelIndex = levelOrder.indexOf(segment.cefrLevel);
      const levelDiff = Math.abs(userLevelIndex - segmentLevelIndex);
      return levelDiff <= 1;
    });

    console.log(`🎯 Found ${matchingSegments.length} matching segments for level ${userLevel}`);

    const totalDuration = analyzedSegments.length > 0
      ? Math.max(...analyzedSegments.map(s => s.endTime))
      : 0;

    return NextResponse.json({
      videoId: finalVideoId,
      videoUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
      title: transcriptData.title,
      description: transcriptData.description,
      duration: totalDuration,
      segments: matchingSegments,
      allSegments: analyzedSegments, // 包含所有片段，UI可以按级别分组显示
      hasSubtitles: true,
      analyzedAt: Date.now(),
    });
  } catch (error: any) {
    console.error('Error analyzing YouTube video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
