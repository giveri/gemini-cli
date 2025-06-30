/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const session = {
  cwd: process.cwd(),
  projectRoot: process.cwd(),
};

export function cd(dir: string) {
  session.cwd = dir;
}

export function get_cwd(): string {
  return session.cwd;
}
