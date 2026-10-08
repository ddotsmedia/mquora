import axios from 'axios';

export class EmbeddingService {
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = process.env.AI_GATEWAY_URL || '';
  }

  async embed(text: string): Promise<number[]> {
    if (!this.gatewayUrl) {
      return Array(768).fill(0);
    }

    try {
      const response = await axios.post(
        `${this.gatewayUrl}/embeddings`,
        { model: 'LaBSE', input: text },
        { timeout: 30000 },
      );
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding service error:', error);
      return Array(768).fill(0);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.gatewayUrl) {
      return texts.map(() => Array(768).fill(0));
    }

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32);
      try {
        const response = await axios.post(
          `${this.gatewayUrl}/embeddings`,
          { model: 'LaBSE', input: batch },
          { timeout: 60000 },
        );
        results.push(...response.data.data.map((d: { embedding: number[] }) => d.embedding));
      } catch (error) {
        console.error('Batch embedding error:', error);
        results.push(...batch.map(() => Array(768).fill(0)));
      }
    }
    return results;
  }
}
