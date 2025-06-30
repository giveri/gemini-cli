/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult } from './tools.js';
import { Config } from '../config/config.js';

export class GetCwdTool extends BaseTool<undefined, ToolResult> {
  static readonly Name = 'get_cwd';

  constructor(private readonly config: Config) {
    super(
      GetCwdTool.Name,
      'GetCwd',
      'Returns the current session working directory.',
      {
        type: 'object',
        properties: {},
      },
    );
  }

  validateToolParams(): string | null {
    return null;
  }

  getDescription(): string {
    return 'Get current working directory';
  }

  async execute(): Promise<ToolResult> {
    const cwd = this.config.getWorkingDir();
    return { llmContent: cwd, returnDisplay: cwd };
  }
}
