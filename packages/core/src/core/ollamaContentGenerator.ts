import {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export class OllamaContentGenerator {
  constructor(private baseUrl: string, private model: string) {}

  private async callApi(body: OllamaRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.response ?? data;
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

  async embedContent(_req: EmbedContentParameters): Promise<EmbedContentResponse> {
    return { embeddings: [] } as EmbedContentResponse;
  }
}
