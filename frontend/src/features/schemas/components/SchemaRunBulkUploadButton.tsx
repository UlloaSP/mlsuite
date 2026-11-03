/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getRouteApi } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useSearchUpdate } from "@/shared/lib/use-search-update";
import { AppButton } from "@/shared/ui/AppButton";
import { isOpenJob, usePredictionJobs } from "@/features/schemas/api/prediction-job-queries";
import { BulkJobsDialog } from "@/features/schemas/components/BulkJobsDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmarkId: string;
  version: SchemaVersionDto;
};


const route = getRouteApi("/protected/app/can-view-models/predict/$bookmarkId");

/**
 * Opens the bookmark's bulk uploads, which run on the server; the count is those still running.
 * The dialog lives in the URL, which is how a finished job's notification leads to its list.
 */
export function SchemaRunBulkUploadButton({ bookmarkId, version }: Props) {
  const search = route.useSearch();
  const updateSearch = useSearchUpdate<typeof search>();
  const dialog = search.bulk;
  const setDialog = (value: typeof dialog) => updateSearch({ bulk: value });
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
