/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BookmarkApiCodeBlock } from "@/features/schemas/components/BookmarkApiCodeBlock";
import { BookmarkApiDocsLines } from "@/features/schemas/components/BookmarkApiDocsLines";
import { BookmarkApiDocsSection } from "@/features/schemas/components/BookmarkApiDocsSection";
import { BookmarkApiDocsTable } from "@/features/schemas/components/BookmarkApiDocsTable";
import { AppBadge } from "@/shared/ui/AppBadge";
import type { ApiDocs } from "@/features/schemas/lib/bookmark-api-docs";

/** The consumer endpoint of a bookmark, read-only; `apiDocsMarkdown` writes the same document. */
export function BookmarkApiDocsPanel({ docs }: { docs: ApiDocs }) {
  return (
    <div className="grid gap-6">
      <BookmarkApiDocsSection title="Endpoint">
        <div className="flex items-center gap-3">
          {/* Wrapped so AppBadge keeps the HTTP verb as written instead of sentence-casing it. */}
          <AppBadge tone="accent">
            <span>{docs.method}</span>
          </AppBadge>
          <code className="min-w-0 break-all font-mono text-xs text-fg">{docs.url}</code>
        </div>
      </BookmarkApiDocsSection>
      <BookmarkApiDocsSection title="Authentication">
        <BookmarkApiDocsLines lines={docs.authentication.lines} />
        <BookmarkApiCodeBlock label="Authentication header" code={docs.authentication.header} />
      </BookmarkApiDocsSection>
      {docs.notice ? (
        <BookmarkApiDocsSection title="Not available">
          <p role="status" className="text-sm leading-6 text-warning-fg">
            {docs.notice}
          </p>
        </BookmarkApiDocsSection>
      ) : null}
      {docs.request ? (
        <BookmarkApiDocsSection title="Request">
          <p className="text-sm text-fg-secondary">
            Content-Type: <code className="font-mono text-xs text-fg">application/json</code>
          </p>
          <BookmarkApiDocsLines lines={docs.request.notes} />
          <BookmarkApiDocsTable
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
          <BookmarkApiCodeBlock label="Request example" code={docs.request.example} />
        </BookmarkApiDocsSection>
      ) : null}
      {docs.response ? (
        <BookmarkApiDocsSection title="Response (200)">
          <BookmarkApiDocsLines lines={[...docs.response.notes, ...docs.response.outputs]} />
          <BookmarkApiCodeBlock label="Response example" code={docs.response.example} />
        </BookmarkApiDocsSection>
      ) : null}
      <BookmarkApiDocsSection title="Errors">
        <BookmarkApiDocsTable
          label="Errors"
          header={["Status", "When"]}
          rows={docs.errors.map((error) => [
            <code key="status" className="font-mono text-xs text-fg">
              {error.status}
            </code>,
            error.when,
          ])}
        />
      </BookmarkApiDocsSection>
      {docs.curl ? (
        <BookmarkApiDocsSection title="Example (cURL)">
          <BookmarkApiCodeBlock label="cURL example" code={docs.curl} />
        </BookmarkApiDocsSection>
      ) : null}
    </div>
  );
}
