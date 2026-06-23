/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? "").trim();

export const getBackendBaseUrl = () =>
  BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
