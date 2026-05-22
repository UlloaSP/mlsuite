/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

declare global {
  interface Window {
    __MLSUITE_CONFIG__?: {
      VITE_BACKEND_URL?: string;
    };
  }
}

const runtimeConfig = typeof window !== "undefined" ? (window.__MLSUITE_CONFIG__ ?? {}) : {};

const configuredBackendUrl =
  runtimeConfig.VITE_BACKEND_URL ?? import.meta.env.VITE_BACKEND_URL ?? "";

const BACKEND_URL = configuredBackendUrl.trim();

export const getBackendBaseUrl = () =>
  BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
