/**
 * Doubao AI Provider
 * 豆包 AI 提供者 - 使用原生 fetch API 调用豆包服务
 */

export interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DoubaoResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DoubaoProvider {
  private apiKey: string;
  private endpoint: string;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(config: {
    apiKey: string;
    endpoint: string;
    model: string;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.model = config.model;
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
    if (config.retryDelay !== undefined) this.retryDelay = config.retryDelay;
  }

  /**
   * Chat completion with retry logic
   */
  async chat(messages: DoubaoMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<DoubaoResponse> {
    const url = this.endpoint;
    
    const payload = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    console.log('🔥 Doubao API Request:', {
      url,
      model: this.model,
      messageCount: messages.length,
      hasApiKey: !!this.apiKey,
      apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NONE',
    });

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Doubao API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            attempt: attempt + 1,
          });
          
          throw new Error(
            `Doubao API error (${response.status} ${response.statusText}): ${errorText}`
          );
        }

        const data: DoubaoResponse = await response.json();
        
        console.log('✅ Doubao API Success:', {
          hasContent: !!data.choices?.[0]?.message?.content,
          contentLength: data.choices?.[0]?.message?.content?.length || 0,
          usage: data.usage,
        });

        return data;
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Doubao attempt ${attempt + 1}/${this.maxRetries} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error; // Auth errors won't be fixed by retrying
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Doubao API call failed after retries');
  }

  /**
   * Parse JSON from response text (handles cases where AI returns text with JSON)
   */
  static parseJSONResponse(text: string): any {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    // Trim whitespace
    const trimmed = text.trim();
    
    // Try direct parse first
    try {
      const parsed = JSON.parse(trimmed);
      // If parsed is a string, it might be a JSON string inside
      if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch {
      // Try to extract JSON from text (handles markdown code blocks, etc.)
      // Remove markdown code blocks if present
      const withoutMarkdown = trimmed
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try parsing again after removing markdown
      try {
        return JSON.parse(withoutMarkdown);
      } catch {
        // Try to find JSON object in the text
        const jsonMatch = withoutMarkdown.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch {
            // Last resort: try to find any JSON-like structure
            const nestedMatch = jsonMatch[0].match(/\{[\s\S]*\}/);
            if (nestedMatch && nestedMatch[0] !== jsonMatch[0]) {
              return JSON.parse(nestedMatch[0]);
            }
          }
        }
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
}
