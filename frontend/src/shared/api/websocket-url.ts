/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getBackendBaseUrl } from "@/shared/config/runtime";

/** The WebSocket address of an API path, on the API's own host. */
export function buildWebSocketUrl(path: string) {
  const url = new URL(getBackendBaseUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}
