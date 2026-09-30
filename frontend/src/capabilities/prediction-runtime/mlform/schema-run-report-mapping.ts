/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  type BindingIdentity,
  mappedTarget,
  targetKey,
} from "@/capabilities/prediction-runtime/mlform/mapped-to";

export const reportTargetForBinding = (
  report: unknown,
  binding?: BindingIdentity,
): string | undefined => {
  if (!isRecord(report)) return undefined;
  return targetKey(mappedTarget(report.mappedTo, binding));
};
