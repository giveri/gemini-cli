/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { BaseTool, ToolResult } from './tools.js';
import { Config, ApprovalMode } from '../config/config.js';
import { isWithinRoot } from '../utils/fileUtils.js';

export interface SetCwdParams {
  path: string;
}

export class SetCwdTool extends BaseTool<SetCwdParams, ToolResult> {
  static readonly Name = 'set_cwd';

  constructor(
    private readonly rootDirectory: string,
    private readonly config: Config,
  ) {
    super(SetCwdTool.Name, 'SetCwd', 'Change the session working directory.', {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to new working directory.',
        },
      },
      required: ['path'],
    });
  }

  validateToolParams(params: SetCwdParams): string | null {
    const absolute = path.isAbsolute(params.path)
      ? params.path
      : path.resolve(this.config.getWorkingDir(), params.path);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
      return 'Path must exist and be a directory.';
    }
    if (
      !isWithinRoot(absolute, this.rootDirectory) &&
      this.config.getApprovalMode() !== ApprovalMode.YOLO
    ) {
      return `Path must be within the root directory (${this.rootDirectory}): ${absolute}`;
    }
    return null;
  }

  getDescription(params: SetCwdParams): string {
    return `Changing working directory to ${params.path}`;
  }

  async execute(params: SetCwdParams): Promise<ToolResult> {
    const error = this.validateToolParams(params);
    if (error) {
      return {
        llmContent: `Error: ${error}`,
        returnDisplay: `Error: ${error}`,
      };
    }
    const absolute = path.isAbsolute(params.path)
      ? params.path
      : path.resolve(this.config.getWorkingDir(), params.path);
    this.config.setWorkingDir(absolute);
    return {
      llmContent: `Changed directory to ${absolute}`,
      returnDisplay: `CWD: ${absolute}`,
    };
  }
}
