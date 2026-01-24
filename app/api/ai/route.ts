import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DoubaoProvider } from '@/lib/doubao/provider';

// Initialize AI clients on server side
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const openai = openaiApiKey && openaiApiKey !== 'your_openai_api_key_here' 
  ? new OpenAI({ apiKey: openaiApiKey }) 
  : null;
const OPENAI_MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

// Doubao AI (豆包 AI) - 字节跳动，使用原生 fetch 调用
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

const AI_PROVIDER = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'auto').toLowerCase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('=== API Route Request ===');
    console.log('Action:', action);
    console.log('Provider:', AI_PROVIDER);
    console.log('Doubao configured:', !!doubao && !!doubaoApiKey);
    console.log('  - API Key:', doubaoApiKey ? `${doubaoApiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('  - Model:', DOUBAO_MODEL);
    console.log('  - Endpoint:', DOUBAO_CHAT_ENDPOINT);
    console.log('OpenAI configured:', !!openai && !!openaiApiKey);
    console.log('  - API Key:', openaiApiKey ? `${openaiApiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('Gemini configured:', !!genAI && !!geminiApiKey);
    console.log('  - Model:', GEMINI_MODEL);

    switch (action) {
      case 'generateDialogue':
        return await handleGenerateDialogue(params);
      case 'evaluateChallenge':
        return await handleEvaluateChallenge(params);
      case 'evaluateShoppingDeal':
        return await handleEvaluateShoppingDeal(params);
      case 'translateText':
        return await handleTranslateText(params);
      case 'optimizeText':
        return await handleOptimizeText(params);
      case 'analyzeSelection':
        return await handleAnalyzeSelection(params);
      case 'generateCheckpointSuggestion':
        return await handleGenerateCheckpointSuggestion(params);
      case 'generateText':
        return await handleGenerateText(params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('=== API Route Error ===');
    console.error('Error:', error.message || error.toString());
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGenerateDialogue(params: any) {
  const { checkpoint, history, systemInstruction, prompt } = params;

  let lastError: any = null;

  // Try Doubao (豆包) FIRST - Primary provider
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao && doubaoApiKey) {
    try {
      console.log('🔥 Trying Doubao (豆包 AI) [PRIMARY]...');
      console.log('   Model:', DOUBAO_MODEL);
      console.log('   Endpoint:', DOUBAO_CHAT_ENDPOINT);
      const messages: any[] = [
        { role: 'system', content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.text,
        })),
        { role: 'user', content: prompt },
      ];

      console.log('   Messages count:', messages.length);
      const completion = await doubao.chat(messages, { temperature: 0.7 });
      console.log('   Doubao raw response received');

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from Doubao');

      // Doubao might return text without JSON formatting, try to parse or format
      let parsed;
      try {
        // First, try to parse as-is
        parsed = DoubaoProvider.parseJSONResponse(text);
        
        // Validate that we have the required fields
        if (!parsed.npc_response && typeof parsed === 'string') {
          // If parsed is a string, it means the JSON was the entire response
          // Try parsing it again
          const reParsed = JSON.parse(parsed);
          parsed = reParsed;
        }
        
        // Ensure we have the required structure
        if (!parsed.npc_response) {
          throw new Error('Invalid response structure: missing npc_response');
        }
        
        // Normalize the response structure
        parsed = {
          npc_response: typeof parsed.npc_response === 'string' ? parsed.npc_response : String(parsed.npc_response || 'Hello there!'),
          user_options: Array.isArray(parsed.user_options) ? parsed.user_options : ['Continue', 'Ask more', 'Goodbye'],
          grammar_check: parsed.grammar_check || { has_error: false }
        };
      } catch (parseError: any) {
        console.warn('⚠️ Failed to parse Doubao response as JSON:', parseError.message);
        console.warn('Raw response text:', text.substring(0, 200));
        
        // Fallback: create a response from the text
        parsed = {
          npc_response: text.trim(),
          user_options: ['Continue', 'Ask more', 'Goodbye'],
          grammar_check: { has_error: false }
        };
      }

      console.log('✅ Doubao success, parsed response:', {
        hasNpcResponse: !!parsed.npc_response,
        npcResponseLength: parsed.npc_response?.length || 0,
        optionsCount: parsed.user_options?.length || 0
      });
      return NextResponse.json(parsed);
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.error('❌ Doubao failed:');
      console.error('   Error message:', errorMsg);
      console.error('   Error type:', error?.constructor?.name);
      console.error('   Error code:', error?.code);
      console.error('   Stack:', error?.stack);
      
      if (AI_PROVIDER === 'doubao') {
        throw new Error(`Doubao API Error: ${errorMsg}`);
      }
      console.log('   Falling back to next provider...');
    }
  }

  // Try OpenAI as second fallback
  if (AI_PROVIDER === 'auto' && openai && openaiApiKey) {
    try {
      console.log('Trying OpenAI [FALLBACK]...');
      const messages: any[] = [
        { role: 'system', content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.text,
        })),
        { role: 'user', content: prompt },
      ];

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(text);
      console.log('✅ OpenAI success');
      return NextResponse.json(parsed);
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.warn('⚠️ OpenAI failed:', errorMsg);
    }
  }

  // Try Gemini as final fallback
  if (genAI && geminiApiKey) {
    try {
      console.log('Trying Gemini [FINAL FALLBACK]...');
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction,
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response from Gemini');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Gemini response');

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Gemini success');
      return NextResponse.json(parsed);
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.error('❌ Gemini failed:', errorMsg);
      lastError = error;
    }
  }

  // All providers failed
  const errorMessage = lastError 
    ? `All AI providers failed. Last error: ${lastError.message || lastError.toString()}`
    : 'No AI provider configured. Please check your API keys in .env.local';
  
  throw new Error(errorMessage);
}

async function handleEvaluateChallenge(params: any) {
  const { prompt } = params;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      const completion = await doubao.chat(
        [
          {
            role: 'system',
            content:
              'You are an English learning evaluation assistant. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3 }
      );

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      const parsed = DoubaoProvider.parseJSONResponse(text);
      return NextResponse.json(parsed);
    } catch (error) {
      console.warn('Doubao evaluation failed:', error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an English learning evaluation assistant. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      return NextResponse.json(JSON.parse(text));
    } catch (error) {
      console.warn('OpenAI evaluation failed:', error);
    }
  }

  // Try Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.warn('Gemini evaluation failed:', error);
    }
  }

  throw new Error('No AI provider available');
}

async function handleEvaluateShoppingDeal(params: any) {
  return handleEvaluateChallenge(params); // Same logic
}

async function handleTranslateText(params: any) {
  const { text } = params;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Invalid text parameter' }, { status: 400 });
  }

  const prompt = `Translate the following English text to Chinese (Simplified). Only return the translation.\n\nText: "${text}"`;

  let lastError: any = null;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      console.log('🔄 [Translation] Trying Doubao...');
      const completion = await doubao.chat(
        [
          {
            role: 'system',
            content:
              'You are a translation assistant. Translate English to Chinese (Simplified). Only return the translation, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3 }
      );
      const translation = completion.choices[0]?.message?.content;
      if (translation) {
        console.log('✅ [Translation] Doubao succeeded');
        return NextResponse.json({ translation });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Translation] Doubao failed:', error?.message || error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      console.log('🔄 [Translation] Trying OpenAI...');
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a translation assistant. Translate English to Chinese (Simplified). Only return the translation, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      const translation = completion.choices[0]?.message?.content;
      if (translation) {
        console.log('✅ [Translation] OpenAI succeeded');
        return NextResponse.json({ translation });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Translation] OpenAI failed:', error?.message || error);
    }
  }

  // Try Gemini
  if (genAI && geminiApiKey) {
    try {
      console.log('🔄 [Translation] Trying Gemini...');
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const translation = result.response.text();
      if (translation) {
        console.log('✅ [Translation] Gemini succeeded');
        return NextResponse.json({ translation });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Translation] Gemini failed:', error?.message || error);
      
      // Provide specific error message for leaked API key
      if (error?.message?.includes('leaked') || error?.message?.includes('403')) {
        return NextResponse.json(
          { error: 'Your API key was reported as leaked. Please use another API key.' },
          { status: 403 }
        );
      }
    }
  }

  // All providers failed
  const errorMessage = lastError?.message || 'No AI provider available';
  console.error('❌ [Translation] All providers failed. Last error:', errorMessage);
  return NextResponse.json(
    { error: `All AI providers failed. Last error: ${errorMessage}` },
    { status: 500 }
  );
}

async function handleOptimizeText(params: any) {
  const { text } = params;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Invalid text parameter' }, { status: 400 });
  }

  const prompt = `Improve the following English sentence to sound more native and natural. Only return the improved sentence.\n\nSentence: "${text}"`;

  let lastError: any = null;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      console.log('🔄 [Optimization] Trying Doubao...');
      const completion = await doubao.chat(
        [
          {
            role: 'system',
            content:
              'You are an English language improvement assistant. Only return the improved sentence, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.5 }
      );
      const optimized = completion.choices[0]?.message?.content;
      if (optimized) {
        console.log('✅ [Optimization] Doubao succeeded');
        return NextResponse.json({ optimized });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Optimization] Doubao failed:', error?.message || error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      console.log('🔄 [Optimization] Trying OpenAI...');
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an English language improvement assistant. Only return the improved sentence, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      });
      const optimized = completion.choices[0]?.message?.content;
      if (optimized) {
        console.log('✅ [Optimization] OpenAI succeeded');
        return NextResponse.json({ optimized });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Optimization] OpenAI failed:', error?.message || error);
    }
  }

  // Try Gemini
  if (genAI && geminiApiKey) {
    try {
      console.log('🔄 [Optimization] Trying Gemini...');
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const optimized = result.response.text();
      if (optimized) {
        console.log('✅ [Optimization] Gemini succeeded');
        return NextResponse.json({ optimized });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [Optimization] Gemini failed:', error?.message || error);
      
      // Provide specific error message for leaked API key
      if (error?.message?.includes('leaked') || error?.message?.includes('403')) {
        return NextResponse.json(
          { error: 'Your API key was reported as leaked. Please use another API key.' },
          { status: 403 }
        );
      }
    }
  }

  // All providers failed
  const errorMessage = lastError?.message || 'No AI provider available';
  console.error('❌ [Optimization] All providers failed. Last error:', errorMessage);
  return NextResponse.json(
    { error: `All AI providers failed. Last error: ${errorMessage}` },
    { status: 500 }
  );
}

async function handleAnalyzeSelection(params: any) {
  const { text, context } = params;
  const prompt = `
    Analyze the selected text: "${text}"
    Context sentence: "${context}"
    
    Provide:
    1. A brief English definition suitable for the context.
    2. A Chinese translation of the selected text.
    
    Output JSON: { "definition": "...", "translation": "..." }
  `;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      const completion = await doubao.chat(
        [
          {
            role: 'system',
            content: 'You are a language analysis assistant. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3 }
      );
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      const parsed = DoubaoProvider.parseJSONResponse(responseText);
      return NextResponse.json(parsed);
    } catch (error) {
      console.warn('Doubao analysis failed:', error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a language analysis assistant. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return NextResponse.json(JSON.parse(responseText));
    } catch (error) {
      console.warn('OpenAI analysis failed:', error);
    }
  }

  // Try Gemini
  if (genAI && geminiApiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.warn('Gemini analysis failed:', error);
    }
  }

  throw new Error('No AI provider available');
}

async function handleGenerateCheckpointSuggestion(params: any) {
  const { prompt } = params;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      const completion = await doubao.chat(
        [
          { role: 'system', content: 'You are a game level generator. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.8 }
      );
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      const parsed = DoubaoProvider.parseJSONResponse(text);
      return NextResponse.json(parsed);
    } catch (error) {
      console.warn('Doubao checkpoint generation failed:', error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a game level generator. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      return NextResponse.json(JSON.parse(text));
    } catch (error) {
      console.warn('OpenAI checkpoint generation failed:', error);
    }
  }

  // Try Gemini
  if (genAI && geminiApiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.warn('Gemini checkpoint generation failed:', error);
    }
  }

  throw new Error('No AI provider available');
}

async function handleGenerateText(params: any) {
  const { prompt } = params;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Invalid prompt parameter' }, { status: 400 });
  }

  let lastError: any = null;

  // Try Doubao first
  if (doubao && doubaoApiKey) {
    try {
      console.log('🔄 [GenerateText] Trying Doubao...');
      const completion = await doubao.chat(
        [
          {
            role: 'system',
            content: 'You are a helpful English learning content generator. Always respond with valid JSON when requested.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      );
      const text = completion.choices[0]?.message?.content;
      if (text) {
        console.log('✅ [GenerateText] Doubao succeeded');
        return NextResponse.json({ text });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [GenerateText] Doubao failed:', error?.message || error);
    }
  }

  // Try OpenAI
  if (openai && openaiApiKey) {
    try {
      console.log('🔄 [GenerateText] Trying OpenAI...');
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful English learning content generator. Always respond with valid JSON when requested.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });
      const text = completion.choices[0]?.message?.content;
      if (text) {
        console.log('✅ [GenerateText] OpenAI succeeded');
        return NextResponse.json({ text });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [GenerateText] OpenAI failed:', error?.message || error);
    }
  }

  // Try Gemini
  if (genAI && geminiApiKey) {
    try {
      console.log('🔄 [GenerateText] Trying Gemini...');
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        console.log('✅ [GenerateText] Gemini succeeded');
        return NextResponse.json({ text });
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ [GenerateText] Gemini failed:', error?.message || error);
    }
  }

  // All providers failed
  const errorMessage = lastError?.message || 'No AI provider available';
  console.error('❌ [GenerateText] All providers failed. Last error:', errorMessage);
  return NextResponse.json(
    { error: `All AI providers failed. Last error: ${errorMessage}` },
    { status: 500 }
  );
}

