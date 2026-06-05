/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SignatureDto } from "../models/api/modelService";
import { sortSignaturesByVersionDesc } from "../models/utils";

export const chooseSchemaSignature = (
  signatures: readonly SignatureDto[],
  preferredId?: string,
): SignatureDto | null => {
  const sorted = sortSignaturesByVersionDesc(signatures);
  return sorted.find((signature) => signature.id === preferredId) ?? sorted[0] ?? null;
};
