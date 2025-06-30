/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult } from './tools.js';

interface Task {
  id: number;
  title: string;
  done: boolean;
}

let nextId = 1;
const q: Task[] = [];

export interface EnqueueTaskParams {
  title: string;
}

export class EnqueueTaskTool extends BaseTool<EnqueueTaskParams, ToolResult> {
  static readonly Name = 'enqueue_task';
  constructor() {
    super(
      EnqueueTaskTool.Name,
      'EnqueueTask',
      'Add a task to the session queue.',
      {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      },
    );
  }
  validateToolParams(params: EnqueueTaskParams): string | null {
    if (!params.title) return 'title is required';
    return null;
  }
  getDescription(params: EnqueueTaskParams): string {
    return `Queue task “${params.title}”`;
  }
  async execute(params: EnqueueTaskParams): Promise<ToolResult> {
    const task: Task = { id: nextId++, title: params.title, done: false };
    q.push(task);
    const text = `queued ${task.id}: ${task.title}`;
    return { llmContent: text, returnDisplay: text };
  }
}

export class ListTasksTool extends BaseTool<undefined, ToolResult> {
  static readonly Name = 'list_tasks';
  constructor() {
    super(ListTasksTool.Name, 'ListTasks', 'List queued tasks.', {
      type: 'object',
      properties: {},
    });
  }
  validateToolParams(): string | null {
    return null;
  }
  getDescription(): string {
    return 'List tasks in the queue';
  }
  async execute(): Promise<ToolResult> {
    const lines = q.map((t) => `${t.id}. ${t.title}${t.done ? ' (done)' : ''}`);
    const text = lines.join('\n') || '(empty)';
    return { llmContent: text, returnDisplay: text };
  }
}

export interface CompleteTaskParams {
  id: number;
}

export class CompleteTaskTool extends BaseTool<CompleteTaskParams, ToolResult> {
  static readonly Name = 'complete_task';
  constructor() {
    super(
      CompleteTaskTool.Name,
      'CompleteTask',
      'Mark a previously enqueued task as complete.',
      {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
    );
  }
  validateToolParams(params: CompleteTaskParams): string | null {
    if (typeof params.id !== 'number') return 'id must be a number';
    return null;
  }
  getDescription(params: CompleteTaskParams): string {
    return `Complete task ${params.id}`;
  }
  async execute(params: CompleteTaskParams): Promise<ToolResult> {
    const t = q.find((task) => task.id === params.id);
    if (!t) {
      const msg = `Task ${params.id} not found`;
      return { llmContent: msg, returnDisplay: msg };
    }
    t.done = true;
    const msg = `completed ${t.id}: ${t.title}`;
    return { llmContent: msg, returnDisplay: msg };
  }
}
