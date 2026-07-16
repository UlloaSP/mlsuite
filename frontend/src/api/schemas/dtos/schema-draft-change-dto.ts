/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftChangeDto = {
  path: string;
  baseValue: unknown;
  basePresent: boolean;
  draftValue: unknown;
  draftPresent: boolean;
  currentValue: unknown;
  currentPresent: boolean;
  draftChanged: boolean;
  conflict: boolean;
};
