/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChartColumn, TextCursorInput } from "lucide-react";
import type { PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";

const counted = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * How much a public bookmark asks for and gives back: the inputs a visitor fills and the
 * reports a run shows, as the server counted them on the public form. Two entries of the
 * description list around it, on a feed card and on the bookmark's page alike.
 */
export function PublicFormSize({
  inputCount,
  reportCount,
}: Pick<PublicBookmarkSummaryDto, "inputCount" | "reportCount">) {
  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <dt className="sr-only">Inputs</dt>
        <TextCursorInput size={14} className="shrink-0" aria-hidden="true" />
        <dd>{counted(inputCount, "input")}</dd>
      </div>
      <div className="inline-flex items-center gap-1.5">
        <dt className="sr-only">Reports</dt>
        <ChartColumn size={14} className="shrink-0" aria-hidden="true" />
        <dd>{counted(reportCount, "report")}</dd>
      </div>
    </>
  );
}
