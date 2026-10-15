/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  fieldFeatures,
  records,
  type ApiDocFeature,
} from "@/features/schemas/lib/bookmark-api-features";
import type { JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { ModelDto } from "@/shared/api/openapi.gen";

/** The part of a bound model the documentation reads: its signature. */
type DocumentedModel = Pick<ModelDto, "inputSchema">;

export type ApiDocError = { status: number; when: string };

/**
 * The consumer endpoint of one bookmark, as data. The preview renders it and `apiDocsMarkdown`
 * writes it, so what is shown and what is copied are the same document.
 */
export type ApiDocs = {
  title: string;
  method: "POST";
  url: string;
  authentication: { lines: string[]; header: string };
  /** Why keys cannot run this bookmark; the request, response and cURL are then absent. */
  notice: string | null;
  request: { features: ApiDocFeature[]; notes: string[]; example: string } | null;
  response: { outputs: string[]; notes: string[]; example: string } | null;
  errors: ApiDocError[];
  curl: string | null;
};

export const API_KEY_HEADER = "X-MLSuite-Key";

// What the runtime's record reader accepts (mlbundle `_value`), not the endpoint's own scalar bound.
const VALUE_RULE =
  "Each value must be a finite number, true or false, or a text holding a decimal number or true/false (at most 64 characters). Category labels and dates are not accepted as text. A feature that allows null may be sent as null.";
const PRESENCE_RULE =
  "Every feature in the table must be present as a key, even when its value may be null: a missing key is refused with 422 (Missing features). Extra keys are ignored.";

const AUTHENTICATION = [
  `Send the key in the ${API_KEY_HEADER} header. Keys never expire; a revoked key is refused with 401 at once.`,
  "The endpoint uses no cookies or credentials, and any origin may call it (CORS).",
  "Call it from your backend: a key in browser JavaScript is visible to anyone who loads the page.",
];

const ERRORS: ApiDocError[] = [
  {
    status: 400,
    when: "The body is not valid JSON, features is missing, or a feature value is not a scalar (a number, a boolean, a text of at most 256 characters, or null).",
  },
  { status: 401, when: "The key is missing, unknown or revoked." },
  { status: 404, when: "The bookmark is not published." },
  {
    status: 409,
    when: "The bookmark's snapshot does not bind exactly one model, its model exceeds the size limit, or the bookmark changed during the run.",
  },
  {
    status: 422,
    when: "The model refused the features. The message includes the runtime's reason, for example missing features or a wrong type.",
  },
  { status: 502, when: "The prediction could not be completed." },
  { status: 503, when: "Too many runs are in progress. Retry shortly." },
];

type Output = { description: string; entry: JsonRecord };

function classLabels(report: JsonRecord): string[] {
  const labels = Array.isArray(report.labels) ? report.labels.map(String) : [];
  return labels.length > 0 ? labels : ["<class label>"];
}

function reportOutput(report: JsonRecord, position: number): Output[] {
  const kind = getString(report.kind);
  if (kind === "regressor") {
    return [{ description: `Output ${position}: a regressor, its value.`, entry: { value: 0.5 } }];
  }
  if (kind !== "classifier") return [];
  const labels = classLabels(report);
  const rest = labels.length > 1 ? Math.round((0.2 / (labels.length - 1)) * 1000) / 1000 : 0;
  const probabilities = Object.fromEntries(
    labels.map((label, index) => [label, labels.length === 1 ? 1 : index === 0 ? 0.8 : rest]),
  );
  return [
    {
      description: `Output ${position}: a classifier, its class and the probability of each class. The classes are ${labels.map((label) => `"${label}"`).join(", ")}.`,
      entry: { prediction: labels[0], probabilities },
    },
  ];
}

const shellQuote = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;

type Input = {
  /** The absolute endpoint address, resolved through the app's API base URL. */
  url: string;
  bookmarkName: string;
  /** How many models the bookmark's snapshot binds. */
  bindingCount: number;
  /** The bound model, once known; only read when exactly one is bound. */
  model: DocumentedModel | undefined;
};

/** Documents the consumer endpoint for a bookmark from the signature of the model it runs. */
export function buildApiDocs({ url, bookmarkName, bindingCount, model }: Input): ApiDocs {
  const base = {
    title: `${bookmarkName}: prediction API`,
    method: "POST" as const,
    url,
    authentication: { lines: AUTHENTICATION, header: `${API_KEY_HEADER}: <your key>` },
    errors: ERRORS,
  };
  if (bindingCount !== 1 || !model) {
    return {
      ...base,
      notice:
        bindingCount === 0
          ? "This bookmark's snapshot binds no model, so keys cannot run it: every call is refused with 409."
          : `This bookmark's snapshot binds ${bindingCount} models, so keys cannot run it: every call is refused with 409. Keys run a bookmark only when its snapshot binds exactly one model.`,
      request: null,
      response: null,
      curl: null,
    };
  }
  const drafts = records(model.inputSchema.fields).flatMap(fieldFeatures);
  const hasOneHot = records(model.inputSchema.fields).some((f) => f.kind === "onehot-category");
  const outputs = records(model.inputSchema.reports).flatMap((report, index) =>
    reportOutput(report, index + 1),
  );
  const requestBody = JSON.stringify(
    { features: Object.fromEntries(drafts.map(({ feature, example }) => [feature.name, example])) },
    null,
    2,
  );
  return {
    ...base,
    notice: null,
    request: {
      features: drafts.map(({ feature }) => feature),
      notes: [
        "Send one record under the model's own feature names.",
        PRESENCE_RULE,
        VALUE_RULE,
        ...(hasOneHot
          ? [
              "A one-hot group is one feature per option: 1 for the chosen option, 0 for the others.",
            ]
          : []),
        "Only the model validates the features. Value ranges and one-hot coherence are the consumer's responsibility.",
      ],
      example: requestBody,
    },
    response: {
      outputs: outputs.map((output) => output.description),
      notes: [
        "One entry per model output, in output order.",
        "Each call is saved as an inference of this organization, with origin API and the key's name as its author.",
      ],
      example: JSON.stringify({ outputs: outputs.map((output) => output.entry) }, null, 2),
    },
    curl: [
      `curl -X POST "${url}" \\`,
      `  -H "${API_KEY_HEADER}: $MLSUITE_API_KEY" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d ${shellQuote(requestBody)}`,
    ].join("\n"),
  };
}

const cell = (text: string) => text.replaceAll("|", "\\|");
const table = (header: string[], rows: string[][]) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
const fence = (code: string, language = "") => `\`\`\`${language}\n${code}\n\`\`\``;

/** The documentation as Markdown, complete enough to hand to the consumer as it is. */
export function apiDocsMarkdown(docs: ApiDocs): string {
  const sections = [
    `# ${docs.title}`,
    `## Endpoint\n\n${fence(`${docs.method} ${docs.url}`)}`,
    `## Authentication\n\n${docs.authentication.lines.map((line) => `- ${line}`).join("\n")}\n\n${fence(docs.authentication.header)}`,
  ];
  if (docs.notice) sections.push(`## Not available\n\n${docs.notice}`);
  if (docs.request) {
    sections.push(
      `## Request\n\nContent-Type: application/json\n\n${docs.request.notes.join("\n\n")}`,
      table(
        ["Feature", "Type", "Null allowed"],
        docs.request.features.map((f) => [`\`${f.name}\``, f.type, f.nullable ? "Yes" : "No"]),
      ),
      `Example:\n\n${fence(docs.request.example, "json")}`,
    );
  }
  if (docs.response) {
    sections.push(
      `## Response (200)\n\n${[...docs.response.notes, ...docs.response.outputs].join("\n\n")}\n\nExample:\n\n${fence(docs.response.example, "json")}`,
    );
  }
  sections.push(
    `## Errors\n\n${table(
      ["Status", "When"],
      docs.errors.map((error) => [String(error.status), error.when]),
    )}`,
  );
  if (docs.curl) sections.push(`## Example (cURL)\n\n${fence(docs.curl, "bash")}`);
  return `${sections.join("\n\n")}\n`;
}
