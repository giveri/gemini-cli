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
        body: JSON.stringify({ ...body, stream: false }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }
      const bodyText = await res.text();
      const lastLine = bodyText
        .trim()
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .pop() || '';
      try {
        const data = JSON.parse(lastLine);
        return data.response ?? data;
      } catch (parseError) {
        const snippet = bodyText.slice(0, 500);
        throw new Error(
          `fetch failed for ${url} with model ${body.model}: ${getErrorMessage(parseError)}. Response text:\n${snippet}`,
        );
      }
    } catch (error) {
      throw new Error(
        `fetch failed for ${url} with model ${body.model}: ${getErrorMessage(error)}`,
      );
    }
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const contents = Array.isArray(request.contents)
      ? request.contents
      : [request.contents];
    const prompt = contents
      .flatMap((c: any) => {
        if (Array.isArray(c)) {
          return c;
        }
        if (typeof c === 'string') {
          return [c];
        }
        if (Array.isArray(c.parts)) {
          return c.parts;
        }
        if (c.parts) {
          return [c.parts];
        }
        return [];
      })
      .map((p: any) => (typeof p === 'string' ? p : p.text || ''))
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
