/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound, Sparkles, Tag, Timer } from "lucide-react";
import { Link } from "react-router";
import { RequestOutcomeBadge } from "@/features/api-access/components/RequestOutcomeBadge";
import { formatDuration } from "@/features/api-access/lib/api-format";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { formatTimestamp } from "@/shared/lib/date-time";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { ApiRequestDto } from "@/shared/api/openapi.gen";

const RequestIcon = SECTION_ICONS.api;

/**
 * One call in the request log. A call that ran links to the inference it made, which holds its
 * features and outputs; the log itself keeps none.
 */
export function RequestEntry({ request }: { request: ApiRequestDto }) {
  return (
    <CatalogEntry
      title={request.clientName}
      titleAccessory={<RequestOutcomeBadge request={request} />}
      icon={<RequestIcon size={16} className="mt-1 text-fg-secondary" />}
      metadata={
        <>
          <span>{formatTimestamp(request.createdAt)}</span>
          {/* A call refused before its bookmark was looked up (a limit, a suspension) names none. */}
          {request.bookmarkName ? (
            <span className="inline-flex items-center gap-1">
              <Tag size={14} />
              {request.bookmarkName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-mono">
            <KeyRound size={14} />
            {request.keyPrefix}…
          </span>
          <span className="inline-flex items-center gap-1">
            <Timer size={14} />
            {formatDuration(request.durationMs)}
          </span>
          <span className="font-mono" title="Request id">
            {request.requestId}
          </span>
        </>
      }
      actions={
        request.predictionRunId ? (
          <Link
            to={`/inferences/${request.predictionRunId}`}
            className={appButtonClass({ size: "sm", variant: "secondary" })}
          >
            <Sparkles size={14} />
            Inference
          </Link>
        ) : null
      }
    />
  );
}
