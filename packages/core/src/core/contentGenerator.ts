/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { getDefaultGeminiModel } from '../config/models.js';
import { OllamaContentGenerator } from './ollamaContentGenerator.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE_PERSONAL = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  USE_OLLAMA = 'ollama',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
  config?: { getModel?: () => string },
): Promise<ContentGeneratorConfig> {
  // Use runtime model from config if available, otherwise fallback to parameter or default
  const effectiveModel =
    config?.getModel?.() || model || getDefaultGeminiModel();

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
  };

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
): Promise<ContentGenerator> {
  if (config.authType === AuthType.USE_OLLAMA) {
    const baseUrl =
      process.env.AI_CHAT_BASE_URL ||
      process.env.OLLAMA_BASE_URL ||
      'http://localhost:11434';
    const model = process.env.AI_CHAT_MODEL || config.model;
    return new OllamaContentGenerator(
      baseUrl,
      model,
    ) as unknown as ContentGenerator;
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  return new OllamaContentGenerator(
    baseUrl,
    config.model,
  ) as unknown as ContentGenerator;
}
