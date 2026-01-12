/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  FunctionDeclaration,
  Part,
  FunctionCall,
} from '@google/genai';
import { getErrorMessage } from '../utils/errors.js';

export interface OllamaRequest {
  model: string;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: string;
  stream?: boolean;
}

export class OllamaContentGenerator {
  constructor(
    private baseUrl: string,
    private model: string,
  ) {}

  private convertContents(contents: Content[]): unknown[] {
    const messages: unknown[] = [];
    for (const content of contents) {
      const textParts: string[] = [];
      const toolCalls: unknown[] = [];
      for (const part of content.parts ?? []) {
        if ((part as Part).text !== undefined) {
          textParts.push((part as Part).text as string);
        } else if ((part as { functionCall?: FunctionCall }).functionCall) {
          const fc = (part as { functionCall: FunctionCall }).functionCall;
          toolCalls.push({
            id: fc.id ?? `${fc.name}-${Date.now()}`,
            type: 'function',
            function: {
              name: fc.name ?? 'undefined_tool_name',
              arguments: JSON.stringify(fc.args || {}),
            },
          });
        } else if ((part as { functionResponse?: unknown }).functionResponse) {
          const fr = (part as { functionResponse: unknown })
            .functionResponse as {
            id?: string;
            name?: string;
            response?: unknown;
          };
          messages.push({
            role: 'tool',
            tool_call_id: fr.id ?? fr.name,
            content:
              typeof fr.response === 'string'
                ? fr.response
                : JSON.stringify(fr.response ?? {}),
          });
        }
      }
      const role = content.role === 'user' ? 'user' : 'assistant';
      const msg: Record<string, unknown> = {
        role,
        content: textParts.join('') || null,
      };
      if (toolCalls.length > 0) {
        msg.tool_calls = toolCalls;
      }
      if (msg.content !== null || toolCalls.length > 0) {
        messages.push(msg);
      }
    }
    return messages;
  }

  private convertTools(decls: FunctionDeclaration[]): unknown[] {
    return decls.map((d) => ({
      type: 'function',
      function: {
        name: d.name,
        description: d.description,
        parameters: d.parameters,
      },
    }));
  }

  private convertResponse(json: unknown): GenerateContentResponse {
    interface ToolCallData {
      id?: string;
      function?: { name?: string; arguments?: string };
    }
    interface OpenAIMessage {
      content?: string | null;
      tool_calls?: ToolCallData[];
    }
    const message =
      (json as { choices?: Array<{ message?: OpenAIMessage }> }).choices?.[0]
        ?.message || {};
    const parts: Part[] = [];
    const functionCalls: FunctionCall[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }
    if (Array.isArray(message.tool_calls)) {
      for (const tc of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          args = {};
        }
        const call: FunctionCall = {
          id: tc.id,
          name: tc.function?.name,
          args,
          isClientInitiated: false,
        } as FunctionCall;
        parts.push({ functionCall: call });
        functionCalls.push(call);
      }
    }
    return {
      candidates: [{ content: { role: 'model', parts } }],
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    } as GenerateContentResponse;
  }

  private async callApi(body: OllamaRequest): Promise<unknown> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
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
      return await res.json();
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
    const messages = this.convertContents(contents as Content[]);
    const req = request as unknown as {
      config?: {
        tools?: Array<{ functionDeclarations?: FunctionDeclaration[] }>;
      };
    };
    const toolsDecls = req.config?.tools?.[0]?.functionDeclarations || [];
    const body: OllamaRequest = {
      model: this.model,
      messages,
      stream: false,
    };
    if (toolsDecls.length > 0) {
      body.tools = this.convertTools(toolsDecls);
      body.tool_choice = 'auto';
    }
    const json = await this.callApi(body);
    return this.convertResponse(json);
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
