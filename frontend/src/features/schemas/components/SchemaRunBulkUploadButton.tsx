/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Upload } from "lucide-react";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppButton } from "@/shared/ui/AppButton";
import { isOpenJob, usePredictionJobs } from "@/features/schemas/api/prediction-job-queries";
import { BulkJobsDialog } from "@/features/schemas/components/BulkJobsDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmarkId: string;
  version: SchemaVersionDto;
};

const DIALOG_STATES = ["closed", "open"] as const;

/**
 * Opens the bookmark's bulk uploads, which run on the server; the count is those still running.
 * The dialog lives in the URL, which is how a finished job's notification leads to its list.
 */
export function SchemaRunBulkUploadButton({ bookmarkId, version }: Props) {
  const [dialog, setDialog] = useSearchParamState("bulk", "closed", DIALOG_STATES);
  const jobs = usePredictionJobs(bookmarkId);
  const running = jobs.data?.filter(isOpenJob).length ?? 0;

  return (
    <>
      <AppButton type="button" variant="secondary" onClick={() => setDialog("open")}>
        <Upload size={16} />
        Bulk upload
        {running > 0 ? <span className="tabular-nums text-fg-muted">{running} running</span> : null}
      </AppButton>
      <BulkJobsDialog
        open={dialog === "open"}
        onClose={() => setDialog("closed")}
        bookmarkId={bookmarkId}
        version={version}
        jobs={jobs}
      />
    </>
  );
}
