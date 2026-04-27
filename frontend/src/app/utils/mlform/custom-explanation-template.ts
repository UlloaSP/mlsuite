/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const customExplanationTemplate = `export default defineExplanationKind({
  kind: "custom-explanation",
  schema: z
    .object({
      kind: z.literal("custom-explanation"),
      id: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      endpoint: z.string().min(1).default("/api/analyzer/explain/by-id"),
    })
    .passthrough(),
  fetch: ({ config }) => ({
    submit: async (request) => {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        credentials: "include",
        body: JSON.stringify({
          values: request.serializedValues,
          fieldValues: request.serializedFieldValues,
          reports: request.reports,
          meta: request.meta,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
  }),
  render: {
    summary: ({ config, state }) => ({
      title: config.label ?? "Custom explanation",
      description: config.description,
      tone: state.status === "error" ? "danger" : "neutral",
    }),
    content: ({ result, state }) => {
      if (state.error) {
        return { type: "notice", title: "Explanation failed", body: state.error, tone: "danger" };
      }
      if (typeof result === "string") {
        return { type: "text", value: result };
      }
      if (Array.isArray(result)) {
        return { type: "list", items: result };
      }
      return { type: "json", value: result ?? { empty: true } };
    },
  },
});
`;
