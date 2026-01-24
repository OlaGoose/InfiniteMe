import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Checkpoint, ShopItem, CheckpointType } from '@/types';
import { DIFFICULTY_CONFIG } from '@/constants';

// AI Provider Configuration
// Options: 'gemini', 'openai', 'auto' (auto will try gemini first, fallback to openai)
const AI_PROVIDER = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'openai').toLowerCase() as 'gemini' | 'openai' | 'auto';

// Use API route for server-side AI calls (more secure, avoids CORS)
const USE_API_ROUTE = true;

// Gemini Configuration
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash-latest';

// OpenAI Configuration
const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
console.log('OpenAI API Key loaded:', openaiApiKey ? `${openaiApiKey.substring(0, 10)}...` : 'NOT FOUND');
console.log('AI Provider:', AI_PROVIDER);

const openai = openaiApiKey && openaiApiKey !== 'your_openai_api_key_here' 
  ? new OpenAI({ 
      apiKey: openaiApiKey, 
      dangerouslyAllowBrowser: true,
      maxRetries: 2,
      timeout: 60000, // 60 seconds timeout
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    }) 
  : null;
const OPENAI_MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
console.log('OpenAI Model:', OPENAI_MODEL);

const BASE_SYSTEM_PROMPT = `
You are a role-playing engine for an English learning game called "StepTrek".
Your goal is to help a user (learner) practice English conversation through immersive scenarios.
`;

export interface AIResponse {
  text: string;
  options: string[];
  grammarCorrection?: {
    corrected: string;
    explanation: string;
  };
}

export interface ChallengeEvaluation {
  score: number;
  feedback: string;
  success: boolean;
}

// Helper function to parse JSON from AI response
const parseJSONResponse = (text: string): any => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  return JSON.parse(jsonMatch[0]);
};

// Gemini implementation
const generateDialogueWithGemini = async (
  checkpoint: Checkpoint,
  history: { role: string; text: string }[]
): Promise<AIResponse> => {
  if (!genAI || !geminiApiKey) throw new Error('Gemini not configured');

  const diffConfig = DIFFICULTY_CONFIG[checkpoint.difficulty];
  const levelConstraint = diffConfig ? diffConfig.aiInstruction : DIFFICULTY_CONFIG.intermediate.aiInstruction;

  const systemInstruction = `
    ${BASE_SYSTEM_PROMPT}
    
    CURRENT PERSONA:
    - Role: ${checkpoint.npcRole}
    - Location: ${checkpoint.name}
    - Scenario: ${checkpoint.scenario}
    
    LINGUISTIC CONSTRAINTS (CRITICAL):
    ${levelConstraint}
    
    BEHAVIOR:
    - Keep responses concise (under 40 words unless Advanced).
    - Correct major grammar mistakes gently.
    - Always provide 3 distinct, natural response options for the user.
  `;

  const historyText = history.map(h => `${h.role === 'model' ? 'NPC' : 'User'}: ${h.text}`).join('\n');
  const lastUserMessage = history.length > 0 && history[history.length - 1].role === 'user'
    ? history[history.length - 1].text
    : null;

  const prompt = `
    Current Conversation History:
    ${historyText}
    
    Instruction:
    1. Analyze the LAST USER MESSAGE (if exists) for grammatical errors based on the difficulty level (don't be too strict for Basic).
    2. Provide the next response from the NPC adhering strictly to the constraints.
    3. Provide 3 suggested English responses for the user to reply with.
    
    Output Format (JSON):
    {
      "npc_response": "The text the NPC says",
      "user_options": ["Option 1", "Option 2", "Option 3"],
      "grammar_check": {
         "has_error": boolean, 
         "corrected_sentence": "Correct version of user's last message", 
         "explanation": "Brief explanation of the error (in English)"
      }
    }
  `;

    const modelWithSystem = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
      systemInstruction,
    });
    const result = await modelWithSystem.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    if (!text) throw new Error('Empty response');

  const parsed = parseJSONResponse(text);

  const aiResponse: AIResponse = {
    text: parsed.npc_response || 'Hello there!',
    options: parsed.user_options || ['Hello', 'How are you?', 'Bye'],
  };

  if (lastUserMessage && parsed.grammar_check?.has_error) {
    aiResponse.grammarCorrection = {
      corrected: parsed.grammar_check.corrected_sentence,
      explanation: parsed.grammar_check.explanation,
    };
  }

  return aiResponse;
};

// OpenAI implementation
const generateDialogueWithOpenAI = async (
  checkpoint: Checkpoint,
  history: { role: string; text: string }[]
): Promise<AIResponse> => {
  console.log('generateDialogueWithOpenAI called');
  console.log('OpenAI client exists:', !!openai);
  console.log('API key exists:', !!openaiApiKey);
  
  if (!openai || !openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI not configured: API key missing or invalid');
  }

  const diffConfig = DIFFICULTY_CONFIG[checkpoint.difficulty];
  const levelConstraint = diffConfig ? diffConfig.aiInstruction : DIFFICULTY_CONFIG.intermediate.aiInstruction;

  const systemMessage = `
    ${BASE_SYSTEM_PROMPT}
    
    CURRENT PERSONA:
    - Role: ${checkpoint.npcRole}
    - Location: ${checkpoint.name}
    - Scenario: ${checkpoint.scenario}
    
    LINGUISTIC CONSTRAINTS (CRITICAL):
    ${levelConstraint}
    
    BEHAVIOR:
    - Keep responses concise (under 40 words unless Advanced).
    - Correct major grammar mistakes gently.
    - Always provide 3 distinct, natural response options for the user.
  `;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.text,
    }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  const lastUserMessage = history.length > 0 && history[history.length - 1].role === 'user'
    ? history[history.length - 1].text
    : null;

  const userPrompt = `
    Instruction:
    1. Analyze the LAST USER MESSAGE (if exists) for grammatical errors based on the difficulty level (don't be too strict for Basic).
    2. Provide the next response from the NPC adhering strictly to the constraints.
    3. Provide 3 suggested English responses for the user to reply with.
    
    Output Format (JSON only, no other text):
    {
      "npc_response": "The text the NPC says",
      "user_options": ["Option 1", "Option 2", "Option 3"],
      "grammar_check": {
         "has_error": boolean, 
         "corrected_sentence": "Correct version of user's last message", 
         "explanation": "Brief explanation of the error (in English)"
      }
    }
  `;

  messages.push({ role: 'user', content: userPrompt });

  console.log('Calling OpenAI API with model:', OPENAI_MODEL);
  console.log('Message count:', messages.length);

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });
    
    console.log('OpenAI API call successful');

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from OpenAI');

    const parsed = parseJSONResponse(text);

    const aiResponse: AIResponse = {
      text: parsed.npc_response || 'Hello there!',
      options: parsed.user_options || ['Hello', 'How are you?', 'Bye'],
    };

    if (lastUserMessage && parsed.grammar_check?.has_error) {
      aiResponse.grammarCorrection = {
        corrected: parsed.grammar_check.corrected_sentence,
        explanation: parsed.grammar_check.explanation,
      };
    }

    return aiResponse;
  } catch (error: any) {
    // Provide more detailed error information
    console.log('Full error object:', error);
    console.log('Error constructor:', error?.constructor?.name);
    console.log('Error keys:', Object.keys(error || {}));
    
    const errorMessage = error?.message || error?.error?.message || 'Unknown error';
    const errorStatus = error?.status || error?.response?.status || error?.statusCode;
    const errorCode = error?.code || error?.error?.code;
    const errorType = error?.type || error?.error?.type;
    
    console.error('OpenAI API Error Details:', {
      message: errorMessage,
      status: errorStatus,
      code: errorCode,
      type: errorType,
      name: error?.name,
    });

    // Check if it's a browser CORS issue
    if (errorMessage.includes('fetch') || errorMessage.includes('CORS') || errorMessage.includes('network')) {
      throw new Error('Browser security error: OpenAI API cannot be called directly from browser. Please set up an API route proxy.');
    }

    // Throw with more context
    if (errorStatus === 401) {
      throw new Error('OpenAI API key is invalid or expired. Please check your API key.');
    } else if (errorStatus === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      throw new Error('Cannot connect to OpenAI API. Please check your internet connection.');
    } else {
      throw new Error(`OpenAI API error: ${errorMessage} (Code: ${errorCode || 'none'}, Status: ${errorStatus || 'none'})`);
    }
  }
};

// Main function with fallback
export const generateDialogue = async (
  checkpoint: Checkpoint,
  history: { role: string; text: string }[]
): Promise<AIResponse> => {
  // Use API route if enabled (recommended for production)
  if (USE_API_ROUTE) {
    try {
      const diffConfig = DIFFICULTY_CONFIG[checkpoint.difficulty];
      const levelConstraint = diffConfig ? diffConfig.aiInstruction : DIFFICULTY_CONFIG.intermediate.aiInstruction;

      const systemInstruction = `
        ${BASE_SYSTEM_PROMPT}
        
        CURRENT PERSONA:
        - Role: ${checkpoint.npcRole}
        - Location: ${checkpoint.name}
        - Scenario: ${checkpoint.scenario}
        
        LINGUISTIC CONSTRAINTS (CRITICAL):
        ${levelConstraint}
        
        BEHAVIOR:
        - Keep responses concise (under 40 words unless Advanced).
        - Correct major grammar mistakes gently.
        - Always provide 3 distinct, natural response options for the user.
      `;

      const historyText = history.map(h => `${h.role === 'model' ? 'NPC' : 'User'}: ${h.text}`).join('\n');
      const lastUserMessage = history.length > 0 && history[history.length - 1].role === 'user'
        ? history[history.length - 1].text
        : null;

      const prompt = `
        Current Conversation History:
        ${historyText}
        
        Instruction:
        1. Analyze the LAST USER MESSAGE (if exists) for grammatical errors based on the difficulty level (don't be too strict for Basic).
        2. Provide the next response from the NPC adhering strictly to the constraints.
        3. Provide 3 suggested English responses for the user to reply with.
        
        Output Format (JSON):
        {
          "npc_response": "The text the NPC says",
          "user_options": ["Option 1", "Option 2", "Option 3"],
          "grammar_check": {
             "has_error": boolean, 
             "corrected_sentence": "Correct version of user's last message", 
             "explanation": "Brief explanation of the error (in English)"
          }
        }
      `;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateDialogue',
          checkpoint,
          history,
          systemInstruction,
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const parsed = await response.json();

      // Validate and normalize the response
      let npcResponse: string;
      let userOptions: string[];
      
      // Handle case where parsed might be a string containing JSON
      if (typeof parsed === 'string') {
        try {
          const reParsed = JSON.parse(parsed);
          npcResponse = reParsed.npc_response || parsed;
          userOptions = reParsed.user_options || ['Hello', 'How are you?', 'Bye'];
        } catch {
          // If it's not valid JSON, use the string as the response
          npcResponse = parsed;
          userOptions = ['Hello', 'How are you?', 'Bye'];
        }
      } else {
        // Normal response structure
        npcResponse = typeof parsed.npc_response === 'string' 
          ? parsed.npc_response 
          : String(parsed.npc_response || 'Hello there!');
        userOptions = Array.isArray(parsed.user_options) 
          ? parsed.user_options 
          : ['Hello', 'How are you?', 'Bye'];
      }

      // Ensure npcResponse is not a JSON string
      if (npcResponse.trim().startsWith('{') && npcResponse.trim().endsWith('}')) {
        try {
          const jsonParsed = JSON.parse(npcResponse);
          if (jsonParsed.npc_response) {
            npcResponse = jsonParsed.npc_response;
            userOptions = jsonParsed.user_options || userOptions;
          }
        } catch {
          // If parsing fails, keep the original response
        }
      }

      const aiResponse: AIResponse = {
        text: npcResponse,
        options: userOptions,
      };

      if (lastUserMessage && parsed.grammar_check?.has_error) {
        aiResponse.grammarCorrection = {
          corrected: parsed.grammar_check.corrected_sentence,
          explanation: parsed.grammar_check.explanation,
        };
      }

      return aiResponse;
    } catch (error: any) {
      console.error('API route error:', error);
      return {
        text: `I'm having trouble connecting... ${error.message || 'Please try again'}`,
        options: ['Try again', 'Wave goodbye', 'Check connection'],
      };
    }
  }

  // Demo mode if no API keys
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return new Promise(resolve => setTimeout(() => resolve({
      text: `[DEMO MODE] Hello! I am ${checkpoint.npcRole} at ${checkpoint.name}. It's beautiful today! (API Key missing)`,
      options: ['Tell me history', 'Take a photo', 'Goodbye'],
    }), 1000));
  }

  // Try Gemini first if auto or explicitly gemini
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    try {
      return await generateDialogueWithGemini(checkpoint, history);
  } catch (error) {
      console.warn('Gemini failed, falling back to OpenAI:', error);
      // Fall through to OpenAI if auto mode
      if (AI_PROVIDER !== 'auto') throw error;
    }
  }

  // Use OpenAI (either explicitly or as fallback)
  if (AI_PROVIDER === 'openai' || (AI_PROVIDER === 'auto' && openai && openaiApiKey && openaiApiKey !== 'your_openai_api_key_here')) {
    try {
      return await generateDialogueWithOpenAI(checkpoint, history);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error('OpenAI API Error:', errorMessage, error);
      
      // Provide user-friendly error message
      let userMessage = "I'm having trouble hearing you clearly...";
      if (errorMessage.includes('API key')) {
        userMessage = "API key issue detected. Please check your OpenAI API key in .env.local";
      } else if (errorMessage.includes('rate limit')) {
        userMessage = "API rate limit exceeded. Please try again in a moment.";
      } else if (errorMessage.includes('connect')) {
        userMessage = "Connection error. Please check your internet connection.";
      }
      
    return {
        text: `${userMessage} (Error: ${errorMessage})`,
      options: ['Try again', 'Wave goodbye', 'Check connection'],
    };
  }
  }

  // Final fallback
  return {
    text: "I'm having trouble hearing you clearly... (No AI provider available)",
    options: ['Try again', 'Wave goodbye', 'Check connection'],
  };
};

// Similar pattern for other functions...
export const evaluateChallenge = async (
  checkpoint: Checkpoint,
  history: { role: string; text: string }[]
): Promise<ChallengeEvaluation> => {
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return { score: 85, feedback: 'Demo Success!', success: true };
  }

  const prompt = `
        Evaluate this Role-Playing Challenge.
        
        Goal: ${checkpoint.challengeConfig?.goalDescription}
        NPC Role: ${checkpoint.npcRole}
        Target Score to Pass: ${checkpoint.challengeConfig?.targetScore}
        Level: ${DIFFICULTY_CONFIG[checkpoint.difficulty].cefr} (${DIFFICULTY_CONFIG[checkpoint.difficulty].label})
        
        Conversation History:
        ${history.map(h => `${h.role === 'model' ? 'NPC' : 'User'}: ${h.text}`).join('\n')}
        
        Task:
        Rate the user (0-100) based on:
        1. Goal Achievement (Did they achieve the goal?)
        2. Grammar & Vocabulary Accuracy (relative to Level ${DIFFICULTY_CONFIG[checkpoint.difficulty].cefr})
        3. Naturalness of expression
        
        Output JSON:
        {
            "score": number, // 0-100
            "feedback": "A short paragraph explaining the score and tips for improvement."
        }
    `;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      return { score: 0, feedback: 'Gemini not initialized.', success: false };
    }
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = parseJSONResponse(text);
      const score = parsed.score || 0;
      const target = checkpoint.challengeConfig?.targetScore || 80;
      return {
        score: score,
        feedback: parsed.feedback || 'Evaluation completed.',
        success: score >= target,
      };
    } catch (error) {
      if (AI_PROVIDER !== 'auto') throw error;
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an English learning evaluation assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      const parsed = parseJSONResponse(text);
    const score = parsed.score || 0;
    const target = checkpoint.challengeConfig?.targetScore || 80;
    return {
      score: score,
      feedback: parsed.feedback || 'Evaluation completed.',
      success: score >= target,
    };
  } catch (e) {
    return { score: 0, feedback: 'Error evaluating challenge (API Quota or Network).', success: false };
  }
  }

  return { score: 0, feedback: 'Error evaluating challenge (No AI provider available).', success: false };
};

export const evaluateShoppingDeal = async (
  item: ShopItem,
  history: { role: string; text: string }[]
): Promise<{ success: boolean; feedback: string }> => {
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return { success: true, feedback: '[Demo] Deal accepted!' };
  }

  const prompt = `
        Evaluate a shopping negotiation.
        Item desired: ${item.name}
        Original Price: ${item.price}
        Goal: The user must clearly express desire to buy and conclude the conversation politely to get a discount.
        
        Conversation:
        ${history.map(h => `${h.role === 'model' ? 'Shopkeeper' : 'User'}: ${h.text}`).join('\n')}
        
        Task:
        Determine if the user successfully negotiated (expressed intent + closed the conversation loop).
        
        Output JSON:
        {
            "success": boolean,
            "feedback": "Short reason why approved or rejected."
        }
    `;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      return { success: false, feedback: 'Gemini not initialized.' };
    }
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = parseJSONResponse(text);
      return {
        success: parsed.success,
        feedback: parsed.feedback || 'Deal evaluation completed.',
      };
    } catch (error) {
      if (AI_PROVIDER !== 'auto') throw error;
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a shopping negotiation evaluator. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      const parsed = parseJSONResponse(text);
    return {
      success: parsed.success,
      feedback: parsed.feedback || 'Deal evaluation completed.',
    };
  } catch (e) {
    return { success: false, feedback: 'Negotiation evaluation failed.' };
  }
  }

  return { success: false, feedback: 'Negotiation evaluation failed (No AI provider available).' };
};

export const translateText = async (text: string): Promise<string> => {
  // Use API route if enabled (recommended for production)
  if (USE_API_ROUTE) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translateText',
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API error: ${response.status}`;
        
        // Provide user-friendly error messages
        if (errorMessage.includes('leaked') || errorMessage.includes('API key')) {
          throw new Error('API key issue. Please check your API keys in .env.local and restart the server.');
        } else if (errorMessage.includes('No AI provider available')) {
          throw new Error('Translation service is currently unavailable. Please check your API keys.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const parsed = await response.json();
      return parsed.translation || 'Translation failed.';
    } catch (error: any) {
      console.error('Translation API route error:', error);
      
      // Return user-friendly error message
      const errorMessage = error?.message || 'Translation service unavailable';
      if (errorMessage.includes('API key') || errorMessage.includes('unavailable')) {
        return `翻译服务暂时不可用。请检查 API 配置。`;
      }
      return `翻译失败：${errorMessage}`;
    }
  }

  // Fallback to direct API calls (not recommended)
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return '[Demo] Translation unavailable';
  }

  const prompt = `Translate the following English text to Chinese (Simplified). Only return the translation.\n\nText: "${text}"`;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      if (AI_PROVIDER !== 'auto') return 'Gemini not initialized.';
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        return result.response.text() || 'Translation failed.';
      } catch (error) {
        if (AI_PROVIDER !== 'auto') return 'Translation error.';
      }
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a translation assistant. Translate English to Chinese (Simplified). Only return the translation, no explanations.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content || 'Translation failed.';
    } catch (e) {
      return 'Translation error.';
    }
  }

  return 'Translation error.';
};

export const optimizeText = async (text: string): Promise<string> => {
  // Use API route if enabled (recommended for production)
  if (USE_API_ROUTE) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimizeText',
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API error: ${response.status}`;
        
        // Provide user-friendly error messages
        if (errorMessage.includes('leaked') || errorMessage.includes('API key')) {
          throw new Error('API key issue. Please check your API keys in .env.local and restart the server.');
        } else if (errorMessage.includes('No AI provider available')) {
          throw new Error('Optimization service is currently unavailable. Please check your API keys.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const parsed = await response.json();
      return parsed.optimized || text;
    } catch (error: any) {
      console.error('Optimization API route error:', error);
      
      // Return user-friendly error message
      const errorMessage = error?.message || 'Optimization service unavailable';
      if (errorMessage.includes('API key') || errorMessage.includes('unavailable')) {
        throw new Error('优化服务暂时不可用。请检查 API 配置。');
      }
      throw new Error(`优化失败：${errorMessage}`);
    }
  }

  // Fallback to direct API calls (not recommended)
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return '[Demo] Optimization unavailable';
  }

  const prompt = `Improve the following English sentence to sound more native and natural. Only return the improved sentence.\n\nSentence: "${text}"`;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      if (AI_PROVIDER !== 'auto') return text;
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        return result.response.text() || text;
      } catch (error) {
        if (AI_PROVIDER !== 'auto') return text;
      }
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an English language improvement assistant. Only return the improved sentence, no explanations.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      });
      return completion.choices[0]?.message?.content || text;
    } catch (e) {
      return text;
    }
  }

  return text;
};

export const analyzeSelection = async (
  text: string,
  context: string
): Promise<{ definition: string; translation: string }> => {
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return { definition: 'Demo definition', translation: '演示翻译' };
  }

    const prompt = `
            Analyze the selected text: "${text}"
            Context sentence: "${context}"
            
            Provide:
            1. A brief English definition suitable for the context.
            2. A Chinese translation of the selected text.
            
            Output JSON: { "definition": "...", "translation": "..." }
        `;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      if (AI_PROVIDER !== 'auto') return { definition: 'Gemini not initialized', translation: 'Error' };
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const parsed = parseJSONResponse(textResponse);
        return {
          definition: parsed.definition || 'No definition found',
          translation: parsed.translation || 'No translation',
        };
      } catch (e) {
        if (AI_PROVIDER !== 'auto') return { definition: 'Error', translation: 'Error' };
      }
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a language analysis assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const textResponse = completion.choices[0]?.message?.content;
      if (!textResponse) throw new Error('Empty response');
      const parsed = parseJSONResponse(textResponse);
    return {
      definition: parsed.definition || 'No definition found',
      translation: parsed.translation || 'No translation',
    };
  } catch (e) {
    return { definition: 'Error', translation: 'Error' };
  }
  }

  return { definition: 'Error', translation: 'Error' };
};

const generateRandomFallback = (requestedType: CheckpointType): Partial<Checkpoint> => {
  const roles = ['Local Artist', 'Busy Commuter', 'Lost Tourist', 'Street Musician', 'Historical Guide', 'Food Critic'];
  const scenarios = ['Discussing the weather', 'Asking for directions', 'Sharing a local legend', 'Debating the best pizza', 'Waiting for the bus'];
  const places = ['Corner Cafe', 'Central Park Bench', 'Old Library', 'Subway Station', 'Market Stall', 'City Square'];

  const randomRole = roles[Math.floor(Math.random() * roles.length)];
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const randomName = places[Math.floor(Math.random() * places.length)];

  return {
    name: randomName,
    scenario: requestedType === 'challenge' ? 'Persuasion Challenge' : randomScenario,
    npcRole: randomRole,
    dialogPrompt: 'Act naturally and engage in conversation.',
    difficulty: 'intermediate',
    type: requestedType,
    challengeConfig: requestedType === 'challenge' ? {
      maxTurns: 5,
      targetScore: 80,
      winReward: 100,
      losePenalty: 50,
      goalDescription: 'Convince the person to agree with you.',
    } : undefined,
  };
};

export const generateCheckpointSuggestion = async (
  lat: number,
  lng: number,
  requestedType: CheckpointType = 'chat'
): Promise<Partial<Checkpoint>> => {
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    return generateRandomFallback(requestedType);
  }

  const prompt = `
        I am generating a ${requestedType.toUpperCase()} level for an English learning walking game.
        Location: Latitude ${lat}, Longitude ${lng}.
        
        Task:
        1. Invent a plausible location name based on generic urban/rural features (e.g. "The Old Oak Tree", "Central Station Entrance", "Corner Cafe").
        2. Create a creative role-play scenario.
        3. Define an NPC (Role).
        ${requestedType === 'challenge' ? '4. Define a specific, slightly difficult GOAL for the user (e.g. "Convince the bouncer to let you in without ID", "Explain a complex problem to a doctor").' : '4. Define a casual conversation starter.'}
        5. Suggest a difficulty level.

        Output JSON format:
        {
            "name": "Name of the place",
            "scenario": "Short scenario title",
            "npcRole": "Role of the NPC",
            "dialogPrompt": "System instruction for the NPC.",
            "difficulty": "basic" | "beginner" | "intermediate" | "advanced",
            "goalDescription": "${requestedType === 'challenge' ? 'Specific goal to win' : 'Just chat'}"
        }
    `;

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (!genAI) {
      console.warn('Gemini not initialized');
      if (AI_PROVIDER !== 'auto') {
        return generateRandomFallback(requestedType);
      }
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = parseJSONResponse(text);

        const resultData: Partial<Checkpoint> = {
          name: parsed.name,
          scenario: parsed.scenario,
          npcRole: parsed.npcRole,
          dialogPrompt: parsed.dialogPrompt,
          difficulty: parsed.difficulty || 'intermediate',
          type: requestedType,
        };

        if (requestedType === 'challenge') {
          resultData.challengeConfig = {
            maxTurns: 5,
            targetScore: 80,
            winReward: 150,
            losePenalty: 50,
            goalDescription: parsed.goalDescription || 'Complete the challenge successfully.',
          };
        }

        return resultData;
      } catch (e) {
        console.warn('Gemini suggestion error, trying OpenAI:', e);
        if (AI_PROVIDER !== 'auto') {
          return generateRandomFallback(requestedType);
        }
      }
    }
  }

  // Use OpenAI
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
      const parsed = parseJSONResponse(text);

    const resultData: Partial<Checkpoint> = {
      name: parsed.name,
      scenario: parsed.scenario,
      npcRole: parsed.npcRole,
      dialogPrompt: parsed.dialogPrompt,
      difficulty: parsed.difficulty || 'intermediate',
      type: requestedType,
    };

    if (requestedType === 'challenge') {
      resultData.challengeConfig = {
        maxTurns: 5,
        targetScore: 80,
        winReward: 150,
        losePenalty: 50,
        goalDescription: parsed.goalDescription || 'Complete the challenge successfully.',
      };
    }

    return resultData;
  } catch (e) {
    console.warn('Suggestion Error (falling back to random):', e);
    return generateRandomFallback(requestedType);
  }
  }

  return generateRandomFallback(requestedType);
};

// ⭐ Generic text generation function for learning content
export const generateText = async (prompt: string): Promise<string> => {
  // Use API route if enabled (recommended for production)
  if (USE_API_ROUTE) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateText',
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const parsed = await response.json();
      return parsed.text || '';
    } catch (error: any) {
      console.error('Generate text API route error:', error);
      throw error;
    }
  }

  // Fallback to direct API calls
  if ((AI_PROVIDER === 'gemini' && (!genAI || !geminiApiKey)) ||
      (AI_PROVIDER === 'openai' && (!openai || !openaiApiKey)) ||
      (AI_PROVIDER === 'auto' && !genAI && !openai)) {
    throw new Error('No AI provider available');
  }

  // Try Gemini first
  if (AI_PROVIDER === 'gemini' || (AI_PROVIDER === 'auto' && genAI && geminiApiKey)) {
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        return result.response.text() || '';
      } catch (error) {
        if (AI_PROVIDER !== 'auto') throw error;
      }
    }
  }

  // Use OpenAI
  if (openai && openaiApiKey) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful English learning content generator. Always respond with valid JSON when requested.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (e) {
      throw new Error('Text generation failed');
    }
  }

  throw new Error('No AI provider available');
};
