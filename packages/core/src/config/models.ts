/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const FALLBACK_GEMINI_MODEL = 'gemini-2.5-pro';
const FALLBACK_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export function getDefaultGeminiModel(): string {
  return process.env.DEFAULT_GEMINI_MODEL || FALLBACK_GEMINI_MODEL;
}

export function getDefaultGeminiFlashModel(): string {
  return process.env.DEFAULT_GEMINI_FLASH_MODEL || FALLBACK_GEMINI_FLASH_MODEL;
}

export function getDefaultGeminiEmbeddingModel(): string {
  return (
    process.env.DEFAULT_GEMINI_EMBEDDING_MODEL ||
    FALLBACK_GEMINI_EMBEDDING_MODEL
  );
}
