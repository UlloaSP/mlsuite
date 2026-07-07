/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftChangeDto = {
  path: string;
  baseValue: unknown;
  draftValue: unknown;
  currentValue: unknown;
  conflict: boolean;
};
