/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Upload } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { isOpenJob, usePredictionJobs } from "@/features/schemas/api/prediction-job-queries";
import { BulkJobsDialog } from "@/features/schemas/components/BulkJobsDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmarkId: string;
  version: SchemaVersionDto;
};

/** Opens the bookmark's bulk uploads, which run on the server; the count is those still running. */
export function SchemaRunBulkUploadButton({ bookmarkId, version }: Props) {
  const [open, setOpen] = useState(false);
  const jobs = usePredictionJobs(bookmarkId);
  const running = jobs.data?.filter(isOpenJob).length ?? 0;

  return (
    <>
      <AppButton type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Upload size={16} />
        Bulk upload
        {running > 0 ? <span className="tabular-nums text-fg-muted">{running} running</span> : null}
      </AppButton>
      <BulkJobsDialog
        open={open}
        onClose={() => setOpen(false)}
        bookmarkId={bookmarkId}
        version={version}
        jobs={jobs}
      />
    </>
  );
}
