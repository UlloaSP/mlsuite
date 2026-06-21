/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface CreateModelRequest {
  name: string;
  modelFile: File;
  dataframeFile?: File;
  oneHotSeparator?: string;
}
