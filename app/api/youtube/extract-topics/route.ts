import { NextRequest, NextResponse } from 'next/server';
import { DoubaoProvider } from '@/lib/doubao/provider';

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

// Generate text using Doubao AI (server-side)
async function generateTextWithDoubao(prompt: string): Promise<string> {
  if (!doubao || !doubaoApiKey) {
    throw new Error('Doubao AI is not configured. Please set DOUBAO_API_KEY environment variable.');
  }

  try {
    console.log('🤖 [Topic Extraction] Attempting Doubao AI (豆包 AI)...');
    console.log('   Model:', DOUBAO_MODEL);
    const completion = await doubao.chat(
      [
        {
          role: 'system',
          content: 'You are a language analysis assistant. Always respond with valid JSON when requested.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3 }
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from Doubao');
    
    console.log('✅ [Topic Extraction] ✅ SUCCESS: Using Doubao AI (豆包 AI)');
    return text;
  } catch (error: any) {
    console.error('❌ [Topic Extraction] Doubao failed:', error?.message || error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const prompt = `Analyze this user's voice input about their daily life, work, or interests. Extract key topics and determine their learning path preference.

User input: "${text}"

Extract:
1. Main topics (3-5 keywords, e.g., "work", "cooking", "travel", "technology")
2. Learning path preference:
   - "daily" = daily high-frequency English (conversations, daily life)
   - "workplace" = workplace/professional English (meetings, presentations, emails)
   - "interest" = interest-based English (hobbies, specific topics)

Respond in JSON format:
{
  "topics": ["work", "marketing", "technology"],
  "learningPath": "workplace"
}`;

    try {
      // Use Doubao AI for topic extraction
      console.log('🤖 [Topic Extraction] Attempting to use Doubao AI (豆包 AI)...');
      const response = await generateTextWithDoubao(prompt);
      const parsed = DoubaoProvider.parseJSONResponse(response);
      console.log('✅ [Topic Extraction] ✅ SUCCESS: Using Doubao AI (豆包 AI)');
      console.log('   📊 Extracted topics:', parsed.topics);
      console.log('   📚 Learning path:', parsed.learningPath);
      return NextResponse.json({
        topics: parsed.topics || [],
        learningPath: parsed.learningPath || 'daily',
      });
    } catch (error) {
      console.error('❌ [Topic Extraction] Doubao AI failed:', error);
      console.log('🔄 [Topic Extraction] ⚠️ FALLBACK: Using rule-based keyword extraction (no AI)');
      // Fallback: simple keyword extraction
      const keywordMatch = text.toLowerCase().match(/\b(work|job|office|meeting|presentation|business|marketing|technology|cooking|travel|sports|music|art|study|school|university|daily|life|hobby|interest)\b/g);
      const keywords: string[] = keywordMatch ? Array.from(keywordMatch) : [];
      const uniqueKeywords: string[] = [...new Set(keywords)];
      
      let learningPath: 'daily' | 'workplace' | 'interest' = 'daily';
      if (uniqueKeywords.some((k: string) => ['work', 'job', 'office', 'meeting', 'presentation', 'business'].includes(k))) {
        learningPath = 'workplace';
      } else if (uniqueKeywords.some((k: string) => ['cooking', 'travel', 'sports', 'music', 'art', 'hobby'].includes(k))) {
        learningPath = 'interest';
      }

      console.log('📊 [Topic Extraction] Fallback result:', {
        topics: uniqueKeywords.slice(0, 5),
        learningPath,
        method: 'rule-based (no AI)',
      });

      return NextResponse.json({
        topics: uniqueKeywords.slice(0, 5),
        learningPath,
      });
    }
  } catch (error: any) {
    console.error('Error extracting topics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract topics' },
      { status: 500 }
    );
  }
}
