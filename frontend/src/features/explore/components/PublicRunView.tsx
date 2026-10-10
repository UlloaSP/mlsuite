/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft } from "lucide-react";
import { formatDisplayValue } from "@/capabilities/prediction-runtime/data/input-display";
import { PublicRunReports } from "@/features/explore/components/PublicRunReports";
import { PublicRunReview } from "@/features/explore/components/PublicRunReview";
import { AppButton } from "@/shared/ui/AppButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { formatTimestamp } from "@/shared/lib/date-time";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmark: Pick<PublicBookmarkDto, "publicId" | "version" | "formSchema">;
  run: PublicRunDto;
  onBack: () => void;
};

/**
 * One kept run in the form's place: its results as the run showed them, the review the visitor
 * gives of them, and the inputs it ran with. A run of an earlier form is shown as it was; its
 * results are read with the form it was made on only when the form is still the same.
 */
export function PublicRunView({ bookmark, run, onBack }: Props) {
  const sameForm = run.version === bookmark.version;
  const inputs = Object.entries(run.inputs);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="truncate text-base font-semibold text-fg">
          Run of {formatTimestamp(run.createdAt)}
        </h2>
        <AppButton size="sm" variant="secondary" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to form
        </AppButton>
      </div>
      <div className="app-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {sameForm ? (
          <>
            <PublicRunReports
              publicId={bookmark.publicId}
              formSchema={bookmark.formSchema}
              run={run}
            />
            <PublicRunReview
              publicId={bookmark.publicId}
              formSchema={bookmark.formSchema}
              run={run}
            />
          </>
        ) : (
          <AppInlineAlert>
            This run was made on an earlier version of the form, so its results are not shown here.
            The inputs it ran with are below.
          </AppInlineAlert>
        )}
        <details className="border-t border-line pt-4" open={!sameForm}>
          <summary
            className={`cursor-pointer rounded-control text-sm font-semibold text-fg ${FOCUS_RING}`}
          >
            Inputs
          </summary>
          {inputs.length === 0 ? (
            <p className="pt-3 text-sm text-fg-muted">This run sent no inputs.</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-2 pt-3 text-sm sm:grid-cols-2">
              {inputs.map(([label, value]) => (
                <div key={label} className="flex min-w-0 justify-between gap-3">
                  <dt className="truncate text-fg-secondary">{label}</dt>
                  <dd className="truncate font-medium text-fg">{formatDisplayValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </details>
      </div>
    </div>
  );
}
