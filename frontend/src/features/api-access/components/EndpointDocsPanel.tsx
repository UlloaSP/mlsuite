/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { DocsCodeBlock } from "@/features/api-access/components/DocsCodeBlock";
import { DocsLines } from "@/features/api-access/components/DocsLines";
import { DocsSection } from "@/features/api-access/components/DocsSection";
import { DocsTable } from "@/features/api-access/components/DocsTable";
import { AppBadge } from "@/shared/ui/AppBadge";
import type { ApiDocs } from "@/features/api-access/lib/endpoint-docs";

/** The consumer endpoint of a bookmark, read-only; `apiDocsMarkdown` writes the same document. */
/** One bookmark's client endpoint, as `buildApiDocs` describes it. */
export function EndpointDocsPanel({ docs }: { docs: ApiDocs }) {
  return (
    <div className="grid gap-6">
      <DocsSection title="Endpoint">
        <div className="flex items-center gap-3">
          {/* Wrapped so AppBadge keeps the HTTP verb as written instead of sentence-casing it. */}
          <AppBadge tone="accent">
            <span>{docs.method}</span>
          </AppBadge>
          <code className="min-w-0 break-all font-mono text-xs text-fg">{docs.url}</code>
        </div>
      </DocsSection>
      <DocsSection title="Authentication">
        <DocsLines lines={docs.authentication.lines} />
        <DocsCodeBlock label="Authentication header" code={docs.authentication.header} />
      </DocsSection>
      {docs.notice ? (
        <DocsSection title="Not available">
          <p role="status" className="text-sm leading-6 text-warning-fg">
            {docs.notice}
          </p>
        </DocsSection>
      ) : null}
      {docs.request ? (
        <DocsSection title="Request">
          <p className="text-sm text-fg-secondary">
            Content-Type: <code className="font-mono text-xs text-fg">application/json</code>
          </p>
          <DocsLines lines={docs.request.notes} />
          <DocsTable
            label="Features"
            header={["Feature", "Type", "Null allowed"]}
            rows={docs.request.features.map((feature) => [
              <code key="name" className="font-mono text-xs text-fg">
                {feature.name}
              </code>,
              feature.type,
              feature.nullable ? "Yes" : "No",
            ])}
          />
          <DocsCodeBlock label="Request example" code={docs.request.example} />
        </DocsSection>
      ) : null}
      {docs.response ? (
        <DocsSection title="Response (200)">
          <DocsLines lines={[...docs.response.notes, ...docs.response.outputs]} />
          <DocsCodeBlock label="Response example" code={docs.response.example} />
        </DocsSection>
      ) : null}
      <DocsSection title="Limits">
        <DocsLines lines={docs.limits} />
      </DocsSection>
      <DocsSection title="Errors">
        <p className="text-sm leading-6 text-fg-secondary">
          Every error is a problem (
          <code className="font-mono text-xs text-fg">application/problem+json</code>) with a stable
          code, a detail, and the requestId when the call was logged.
        </p>
        <DocsTable
          label="Errors"
          header={["Status", "Code", "When"]}
          rows={docs.errors.map((error) => [
            <code key="status" className="font-mono text-xs text-fg">
              {error.status}
            </code>,
            <code key="code" className="font-mono text-xs text-fg">
              {error.code}
            </code>,
            error.when,
          ])}
        />
      </DocsSection>
      {docs.curl ? (
        <DocsSection title="Example (cURL)">
          <DocsCodeBlock label="cURL example" code={docs.curl} />
        </DocsSection>
      ) : null}
    </div>
  );
}
