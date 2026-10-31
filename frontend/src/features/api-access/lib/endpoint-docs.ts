/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  fieldFeatures,
  records,
  type ApiDocFeature,
} from "@/features/api-access/lib/endpoint-features";
import type { JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { ModelDto } from "@/shared/api/openapi.gen";

/** The part of a bound model the documentation reads: its signature. */
type DocumentedModel = Pick<ModelDto, "inputSchema">;

export type ApiDocError = { status: number; code: string; when: string };

/**
 * The client endpoint of one bookmark, as data. The panel renders it and `apiDocsMarkdown`
 * writes it, so what is shown and what is copied are the same document.
 */
export type ApiDocs = {
  title: string;
  method: "POST";
  url: string;
  authentication: { lines: string[]; header: string };
  /** Why clients cannot run this bookmark now; the request, response and cURL are then absent. */
  notice: string | null;
  request: { features: ApiDocFeature[]; notes: string[]; example: string } | null;
  response: { outputs: string[]; notes: string[]; example: string } | null;
  limits: string[];
  errors: ApiDocError[];
  curl: string | null;
};

export const API_KEY_HEADER = "X-MLSuite-Key";

// What the runtime's record reader accepts (mlbundle `_value`), not the endpoint's own scalar bound.
const VALUE_RULE =
  "Each value must be a finite number, true or false, or a text holding a decimal number or true/false (at most 64 characters). Category labels and dates are not accepted as text. A feature that allows null may be sent as null.";
const PRESENCE_RULE =
  "Every feature in the table must be present as a key, even when its value may be null: a missing key is refused with 422 (features_rejected). Extra keys are ignored.";

const AUTHENTICATION = [
  `Send one of the client's keys in the ${API_KEY_HEADER} header. Keys never expire; a revoked key is refused with 401 at once.`,
  "The endpoint uses no cookies or credentials, and any origin may call it (CORS).",
  "Call it from your backend: a key in browser JavaScript is visible to anyone who loads the page.",
];

const LIMITS = [
  "Each client may make a limited number of calls a minute, and all of a workspace's clients together a limited number of successful calls a calendar month (UTC). Past either limit a call is refused with 429 and a Retry-After header in seconds.",
  "Runs of API clients share a few runtime slots. When none is free, or the model's environment is still being prepared after an upload, a call is refused with 503 and Retry-After; retry it then.",
];

const ERRORS: ApiDocError[] = [
  { status: 400, code: "invalid_body", when: "The body is not JSON, or has no features object." },
  {
    status: 400,
    code: "invalid_features",
    when: "A feature value is not a scalar (a number, a boolean, a text of at most 256 characters, or null).",
  },
  { status: 401, code: "invalid_key", when: "The key is missing, unknown or revoked." },
  { status: 403, code: "client_suspended", when: "The platform suspended this client." },
  { status: 404, code: "bookmark_not_found", when: "The client was not given this bookmark." },
  {
    status: 409,
    code: "bookmark_not_runnable",
    when: "The bookmark's snapshot does not bind exactly one model, its model exceeds the size limit, or its model's environment could not be prepared.",
  },
  {
    status: 409,
    code: "bookmark_changed",
    when: "The bookmark moved to another snapshot during the run.",
  },
  {
    status: 422,
    code: "features_rejected",
    when: "The model refused the features. The detail gives the runtime's reason.",
  },
  { status: 429, code: "rate_limited", when: "The client's calls of this minute are used up." },
  {
    status: 429,
    code: "quota_exceeded",
    when: "The organization's calls of this month are used up.",
  },
  { status: 500, code: "internal_error", when: "The call could not be completed." },
  { status: 502, code: "runtime_failed", when: "The prediction could not be completed." },
  {
    status: 503,
    code: "runtime_busy",
    when: "Every runtime slot for clients is in use, or the model's environment is still being prepared.",
  },
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
  /** Resolves an API path to the absolute address clients call. */
  url: (path: string) => string;
  bookmark: { apiId: string; name: string; refusal: string | null; modelName: string | null };
  /** The bound model, once known; read only when clients can run the bookmark. */
  model: DocumentedModel | undefined;
};

/** Documents the client endpoint of a bookmark from the signature of the model it runs. */
export function buildApiDocs({ url, bookmark, model }: Input): ApiDocs {
  const base = {
    title: `${bookmark.name}: prediction API`,
    method: "POST" as const,
    url: url(`/api/v1/bookmarks/${bookmark.apiId}/predictions`),
    authentication: { lines: AUTHENTICATION, header: `${API_KEY_HEADER}: <your key>` },
    limits: LIMITS,
    errors: ERRORS,
  };
  if (bookmark.refusal || !model) {
    return {
      ...base,
      notice:
        `Clients cannot run this bookmark now: every call is refused with 409. ${bookmark.refusal ?? ""}`.trim(),
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
  const response = {
    requestId: "3f0c6a8e-2b1d-4c5e-9a7f-0d1e2f3a4b5c",
    bookmark: { id: bookmark.apiId, name: bookmark.name },
    snapshot: { version: 1, name: "<snapshot name>" },
    model: { name: bookmark.modelName ?? "<model name>", sha256: "<artifact SHA-256>" },
    outputs: outputs.map((output) => output.entry),
  };
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
        "Only the model validates the features. Value ranges and one-hot coherence are the client's responsibility.",
      ],
      example: requestBody,
    },
    response: {
      outputs: outputs.map((output) => output.description),
      notes: [
        "requestId names the call in the workspace's request log and is also sent as the X-Request-Id header. bookmark, snapshot and model say what ran.",
        "outputs holds one entry per model output, in output order.",
        "Each call is saved as an inference of this workspace, with origin API and the client's name as its author.",
      ],
      example: JSON.stringify(response, null, 2),
    },
    curl: [
      `curl -X POST "${base.url}" \\`,
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

/** The documentation as Markdown, complete enough to hand to the client as it is. */
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
    `## Limits\n\n${docs.limits.map((line) => `- ${line}`).join("\n")}`,
    `## Errors\n\nEvery error is a problem (application/problem+json) with a stable code, a detail, and the requestId when the call was logged.\n\n${table(
      ["Status", "Code", "When"],
      docs.errors.map((error) => [String(error.status), `\`${error.code}\``, error.when]),
    )}`,
  );
  if (docs.curl) sections.push(`## Example (cURL)\n\n${fence(docs.curl, "bash")}`);
  return `${sections.join("\n\n")}\n`;
}
