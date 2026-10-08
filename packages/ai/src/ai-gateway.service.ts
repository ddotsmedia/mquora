import axios, { AxiosError } from 'axios';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

export class AiGatewayService {
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = process.env.AI_GATEWAY_URL || '';
  }

  async chat(messages: AiMessage[], model = 'gpt-4o-mini'): Promise<string> {
    if (!this.gatewayUrl) {
      return '';
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await axios.post(
          `${this.gatewayUrl}/chat`,
          { model, messages },
          { timeout: 30000 },
        );
        return response.data.choices[0].message.content;
      } catch (error) {
        lastError = error instanceof AxiosError ? error : new Error(String(error));
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    console.error('Chat service error:', lastError);
    return '';
  }

  async moderate(text: string): Promise<ModerationResult> {
    if (!this.gatewayUrl) {
      return { flagged: false, categories: [] };
    }

    try {
      const response = await axios.post(
        `${this.gatewayUrl}/moderate`,
        { input: text },
        { timeout: 30000 },
      );
      return {
        flagged: response.data.results[0].flagged,
        categories: response.data.results[0].categories || [],
      };
    } catch (error) {
      console.error('Moderation service error:', error);
      return { flagged: false, categories: [] };
    }
  }
}
