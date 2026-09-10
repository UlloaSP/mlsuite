/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
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
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "./dist",
    rolldownOptions: {
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
