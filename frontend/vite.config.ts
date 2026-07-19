/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  server: {
    proxy: {
      "/api": {
        target: "http://spring-app:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react({
      plugins: [],
      disableOxcRecommendation: true,
    }),
    tailwindcss(),
  ],
  build: {
    outDir: "./dist",
    emptyOutDir: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "monaco",
              test: /node_modules[\\/](?:@monaco-editor[\\/]react|monaco-editor)(?:[\\/]|$)/,
            },
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
