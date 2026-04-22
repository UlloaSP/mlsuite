/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite-plus";

export default defineConfig(({ command }) => {
  const isServe = command === "serve";

  return {
    fmt: {},
    lint: { "options": { "typeAware": true, "typeCheck": true } },
    server: isServe
      ? {
        https: {
          key: ".cert/localhost-key.pem",
          cert: ".cert/localhost.pem",
        },
      }
      : undefined,
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
              }
            ],
          },
        },
      },
    },
  };
});
