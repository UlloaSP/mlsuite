/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toast } from "@/shared/ui/toast";
import { isHttpError } from "@/shared/api/http";

/**
 * Toasts a failure no screen owns with what the server said about it. Status codes and request
 * paths are for developers, so the toast never shows them.
 */
export function emitErrorFromUnknown(err: unknown) {
  if (isHttpError(err) && err.status !== 0 && err.message) {
    toast.error(err.message);
    return;
  }
  toast.error("The server could not be reached. Check your connection and try again.");
}
