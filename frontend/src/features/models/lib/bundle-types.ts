/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type Bundle = {
  id: number;
  modelFile: File;
  name: string;
  saved: boolean;
  /** Saved, and the server is preparing the environment the model will run in. */
  preparing: boolean;
  saving: boolean;
};
