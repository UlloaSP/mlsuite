/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type ArtifactDataframeMatchDto = {
  dataframeIndex: number;
  compatible: boolean;
  missing: string[];
  extra: string[];
  score: number;
};
