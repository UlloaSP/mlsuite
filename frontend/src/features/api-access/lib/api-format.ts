/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toast } from "sonner";
import { isHttpError } from "@/shared/api/http";
import type { ApiRequestDto } from "@/shared/api/openapi.gen";

/** A call succeeded below 400, was the caller's to fix in 4xx, and the platform's in 5xx. */
export type Outcome = "succeeded" | "rejected" | "failed";

export const outcomeOf = (status: number): Outcome =>
  status < 400 ? "succeeded" : status < 500 ? "rejected" : "failed";

export const OUTCOME_TONE = {
  succeeded: "success",
  rejected: "warning",
  failed: "danger",
} as const;

/** The status and, for a refusal, the problem code the caller read: "422 features_rejected". */
export const outcomeLabel = (request: Pick<ApiRequestDto, "status" | "errorCode">) =>
  request.errorCode ? `${request.status} ${request.errorCode}` : String(request.status);

const COUNT = new Intl.NumberFormat(undefined);

export const formatCount = (value: number) => COUNT.format(value);

/** A share of the calls, or an em dash when there were none to share. */
export const formatShare = (part: number, total: number) =>
  total === 0 ? "—" : `${((part / total) * 100).toFixed(part === total || part === 0 ? 0 : 1)} %`;

export const formatDuration = (ms: number | null | undefined) =>
  ms === null || ms === undefined
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : `${(ms / 1000).toFixed(1)} s`;

export const failureMessage = (error: unknown) =>
  isHttpError(error) ? error.message : "The request failed. Try again.";

export async function copyText(text: string, copied: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(copied);
  } catch {
    toast.error("Could not copy", { description: "Select the text and copy it by hand." });
  }
}
