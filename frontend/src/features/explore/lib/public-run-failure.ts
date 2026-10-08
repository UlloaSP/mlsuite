/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isHttpError } from "@/shared/api/http";

export type PublicRunFailure = { title: string; detail: string };

/**
 * What a visitor is told when a public run does not happen. The API's messages for refused
 * runs are written for visitors and repeat nothing internal, so they are shown as they come;
 * a failure behind the API gets a fixed message.
 */
export const publicRunFailure = (error: unknown): PublicRunFailure => {
  const status = isHttpError(error) ? error.status : 0;
  const message = isHttpError(error) ? error.message : "";
  switch (status) {
    case 400:
    case 422:
      return { title: "These values could not be run", detail: message };
    case 404:
      return {
        title: "This bookmark is no longer public",
        detail: "It was unpublished or removed after this page was loaded.",
      };
    case 409:
      return { title: "This form cannot be run right now", detail: message };
    case 503:
      return {
        title: "The models are busy",
        detail: "Too many public runs are in progress. Try again in a moment.",
      };
    case 0:
      return {
        title: "The run did not reach the server",
        detail: "Check your connection and try again.",
      };
    default:
      return {
        title: "The run failed",
        detail: "The prediction could not be completed. Try again later.",
      };
  }
};
