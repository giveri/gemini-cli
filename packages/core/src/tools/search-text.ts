/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { BaseTool, ToolResult } from './tools.js';
import { SchemaValidator } from '../utils/schemaValidator.js';

export interface SearchTextParams {
  pattern: string;
  ignoreCase?: boolean;
  maxResults?: number;
}

export class SearchTextTool extends BaseTool<SearchTextParams, ToolResult> {
  static readonly Name = 'search_text';

  constructor(private rootDirectory: string) {
    super(
      SearchTextTool.Name,
      'SearchText',
      'Finds files whose contents match a given text or regular expression.',
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Regex or literal text to search for',
          },
          ignoreCase: {
            type: 'boolean',
            description:
              'Whether search is case-insensitive. Defaults to true.',
            default: true,
          },
          maxResults: {
            type: 'integer',
            description:
              'Maximum number of results to return. Defaults to 100.',
            minimum: 1,
            maximum: 500,
            default: 100,
          },
        },
        required: ['pattern'],
      },
    );
    this.rootDirectory = path.resolve(rootDirectory);
  }

  validateToolParams(params: SearchTextParams | string): string | null {
    if (typeof params === 'string') {
      params = { pattern: params };
    }
    if (
      this.schema.parameters &&
      !SchemaValidator.validate(
        this.schema.parameters as Record<string, unknown>,
        params,
      )
    ) {
      return 'Parameters failed schema validation.';
    }
    return null;
  }

  getDescription(params: SearchTextParams): string {
    return params.pattern;
  }

  async execute(
    params: SearchTextParams | string,
    _signal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      return {
        llmContent: `Error: ${validationError}`,
        returnDisplay: validationError,
      };
    }
    if (typeof params === 'string') {
      params = { pattern: params };
    }
    const re = new RegExp(
      params.pattern,
      params.ignoreCase !== false ? 'i' : '',
    );
    const matches: string[] = [];
    for (const file of fg.sync('**/*.{js,ts,jsx,tsx,json,md}', {
      cwd: this.rootDirectory,
      ignore: ['node_modules/**', '.git/**'],
    })) {
      const abs = path.join(this.rootDirectory, file);
      const content = readFileSync(abs, 'utf8');
      if (re.test(content)) {
        matches.push(file);
        if (matches.length >= (params.maxResults ?? 100)) break;
      }
    }
    const count = matches.length;
    const fileList = matches.join('\n');
    const llmContent =
      count === 0
        ? `No files matched pattern "${params.pattern}".`
        : `Found ${count} file(s) containing "${params.pattern}":\n${fileList}`;
    return { llmContent, returnDisplay: llmContent };
  }
}

export default SearchTextTool;
