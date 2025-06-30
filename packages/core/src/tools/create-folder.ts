/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { BaseTool, ToolResult } from './tools.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { Config, ApprovalMode } from '../config/config.js';

export interface CreateFolderParams {
  /**
   * The absolute path to the directory to create
   */
  path: string;
}

export class CreateFolderTool extends BaseTool<CreateFolderParams, ToolResult> {
  static readonly Name = 'create_folder';

  constructor(
    private readonly rootDirectory: string,
    private readonly config: Config,
  ) {
    super(
      CreateFolderTool.Name,
      'CreateFolder',
      'Creates a directory (recursively) at the given path. Relative paths are resolved against the current working directory.',
      {
        properties: {
          path: {
            description:
              'Absolute or relative path to the directory to create.',
            type: 'string',
          },
        },
        required: ['path'],
        type: 'object',
      },
    );
    this.rootDirectory = path.resolve(rootDirectory);
  }

  private isWithinRoot(dirpath: string): boolean {
    const normalizedPath = path.normalize(dirpath);
    const normalizedRoot = path.normalize(this.rootDirectory);
    const rootWithSep = normalizedRoot.endsWith(path.sep)
      ? normalizedRoot
      : normalizedRoot + path.sep;
    return (
      normalizedPath === normalizedRoot ||
      normalizedPath.startsWith(rootWithSep)
    );
  }

  validateToolParams(params: CreateFolderParams): string | null {
    if (
      this.schema.parameters &&
      !SchemaValidator.validate(
        this.schema.parameters as Record<string, unknown>,
        params,
      )
    ) {
      return 'Parameters failed schema validation.';
    }
    const absPath = path.isAbsolute(params.path)
      ? params.path
      : path.resolve(this.config.getWorkingDir(), params.path);
    if (
      !this.isWithinRoot(absPath) &&
      this.config.getApprovalMode() !== ApprovalMode.YOLO
    ) {
      return `Path must be within the root directory (${this.rootDirectory}): ${absPath}`;
    }
    return null;
  }

  getDescription(params: CreateFolderParams): string {
    const absPath = path.isAbsolute(params.path)
      ? params.path
      : path.resolve(this.config.getWorkingDir(), params.path);
    const relativePath = makeRelative(absPath, this.rootDirectory);
    const display = this.isWithinRoot(absPath)
      ? shortenPath(relativePath)
      : absPath;
    return `Creating directory ${display}`;
  }

  async shouldConfirmExecute(
    _params: CreateFolderParams,
    _abortSignal: AbortSignal,
  ): Promise<false> {
    return false;
  }

  async execute(params: CreateFolderParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    const absPath = path.isAbsolute(params.path)
      ? params.path
      : path.resolve(this.config.getWorkingDir(), params.path);
    if (validationError) {
      return {
        llmContent: `Error: ${validationError}`,
        returnDisplay: `Error: ${validationError}`,
      };
    }
    try {
      fs.mkdirSync(absPath, { recursive: true });
      return {
        llmContent: `Created directory: ${absPath}`,
        returnDisplay: `Created directory: ${absPath}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        llmContent: `Error creating directory: ${message}`,
        returnDisplay: `Error: ${message}`,
      };
    }
  }
}
