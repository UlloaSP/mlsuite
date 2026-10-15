/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy } from "lucide-react";
import { useMemo } from "react";
import { useDocumentedModel } from "@/features/api-access/api/api-access.queries";
import { EndpointDocsPanel } from "@/features/api-access/components/EndpointDocsPanel";
import { apiDocsMarkdown, buildApiDocs } from "@/features/api-access/lib/endpoint-docs";
import { copyText, failureMessage } from "@/features/api-access/lib/api-format";
import { apiUrl } from "@/shared/api/http";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import type { ApiAccessBookmarkDto } from "@/shared/api/openapi.gen";

type Props = { bookmark: ApiAccessBookmarkDto & { apiId: string } };

/**
 * The endpoint of one bookmark given to a client, documented from the signature of the model it
 * runs, ready to hand to the client's developers as Markdown or cURL.
 */
export function EndpointDocsView({ bookmark }: Props) {
  const runnable = !bookmark.refusal;
  const model = useDocumentedModel(runnable ? bookmark.modelId : null);
  const docs = useMemo(
    () =>
      !runnable || model.data
        ? buildApiDocs({
            url: apiUrl,
            bookmark: {
              apiId: bookmark.apiId,
              name: bookmark.name,
              refusal: bookmark.refusal,
              modelName: bookmark.modelName,
            },
            model: model.data,
          })
        : undefined,
    [bookmark, model.data, runnable],
  );

  if (runnable && model.isLoading)
    return <AppLoadingState compact label="Loading the model's signature…" />;
  if (!docs) {
    return (
      <AppEmptyState
        compact
        title="The model's signature did not load"
        description={failureMessage(model.error)}
        action={
          <AppButton variant="secondary" onClick={() => void model.refetch()}>
            Try again
          </AppButton>
        }
      />
    );
  }
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <AppButton
          variant="secondary"
          disabled={!docs.curl}
          onClick={() => docs.curl && void copyText(docs.curl, "cURL example copied")}
        >
          <Copy size={16} />
          Copy cURL
        </AppButton>
        <AppButton
          variant="secondary"
          onClick={() => void copyText(apiDocsMarkdown(docs), "Docs copied")}
        >
          <Copy size={16} />
          Copy as Markdown
        </AppButton>
      </div>
      <EndpointDocsPanel docs={docs} />
    </div>
  );
}
