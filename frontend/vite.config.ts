/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

// Generated from api/openapi.json by `vp run api:types`; test/openapi-types.test.ts keeps it current.
const API_TYPES = "src/shared/api/openapi.gen.ts";

export default defineConfig({
  fmt: { ignorePatterns: [API_TYPES] },
  lint: { ignorePatterns: [API_TYPES], options: { typeAware: true, typeCheck: true } },
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  server: {
    // The plugin sandbox iframe has an opaque origin (its `sandbox` attribute drops
    // allow-same-origin in every environment), so its module scripts are cross-origin requests.
    // Production serves them with `Access-Control-Allow-Origin: *` from nginx; the dev server
    // needs the same, or the sandbox cannot load. (In production nginx also sets the CSPs that
    // keep the document opaque when opened top-level; dev relies on the iframe attribute alone.)
    cors: true,
    proxy: {
      "/api": {
        target: "http://spring-app:8080",
        changeOrigin: true,
        ws: true,
      },
      "/startup/services": {
        target: "http://ops-agent:8091",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  test: { maxWorkers: 4 },
  build: {
    outDir: "./dist",
    rolldownOptions: {
      // The plugin sandbox is a document of its own; only it loads plugin code and TypeScript.
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        "plugin-sandbox": resolve(import.meta.dirname, "plugin-sandbox.html"),
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: "typescript",
              test: /node_modules[\\/]typescript(?:[\\/]|$)/,
            },
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom)(?:[\\/]|$)/,
            },
          ],
        },
      },
    },
  },
});
