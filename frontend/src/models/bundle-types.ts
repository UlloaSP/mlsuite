/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type Bundle = {
  id: number;
  modelFile: File | null;
  dfFile: File | null;
  name: string;
  saved: boolean;
  saving: boolean;
};
