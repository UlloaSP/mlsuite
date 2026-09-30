/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toast } from "sonner";
import { HttpError, isHttpError } from "@/shared/api/http";
import type { ErrorDto } from "@/shared/api/openapi.gen";

const toastErrorDto = (error: ErrorDto) => {
  toast.error(error.message || "Request failed", {
    description: `${error.status} ${error.path}`,
  });
};

export function emitErrorFromUnknown(err: unknown) {
  if (isHttpError(err)) {
    toastErrorDto((err as HttpError).dto);
    return;
  }
  toastErrorDto({
    timestamp: new Date().toISOString(),
    status: 0,
    message: "Network or unknown error",
    path: typeof window !== "undefined" ? window.location.pathname : "/",
  });
}
