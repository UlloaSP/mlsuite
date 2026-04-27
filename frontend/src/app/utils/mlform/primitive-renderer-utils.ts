/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toDisplayString } from "../../utils/display";

export const toElementString = (value: unknown): string => toDisplayString(value);

export const isRenderableResult = (value: unknown): boolean =>
  typeof value === "string" ||
  Array.isArray(value) ||
  (typeof value === "object" && value !== null);
