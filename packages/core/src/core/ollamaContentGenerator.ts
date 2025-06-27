import {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';
import { getErrorMessage } from '../utils/errors.js';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export class OllamaContentGenerator {
  constructor(
    private baseUrl: string,
    private model: string,
  ) {}

  private async callApi(body: OllamaRequest): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }
      const data = await res.json();
      return data.response ?? data;
    } catch (error) {
      throw new Error(
        `fetch failed for ${url} with model ${body.model}: ${getErrorMessage(error)}`,
      );
    }
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const prompt = request.contents
      .flatMap((c) => c.parts ?? [])
      .map((p) => (typeof p === 'string' ? p : p.text || ''))
      .join('\n');
    const text = await this.callApi({ model: this.model, prompt });
    return {
      candidates: [
        {
          content: { role: 'model', parts: [{ text }] },
        },
      ],
    } as GenerateContentResponse;
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const resp = await this.generateContent(request);
    async function* gen() {
      yield resp;
    }
    return gen();
  }

  async countTokens(_req: CountTokensParameters): Promise<CountTokensResponse> {
    return { totalTokens: 0 } as CountTokensResponse;
  }

  async embedContent(
    _req: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return { embeddings: [] } as EmbedContentResponse;
  }
}
