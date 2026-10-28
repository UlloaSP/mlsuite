/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { BulkJobEntry } from "@/features/schemas/components/BulkJobEntry";
import { MAX_BULK_ROWS, useBulkJobUpload } from "@/features/schemas/lib/use-bulk-job-upload";
import type { PredictionJobDto, SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  open: boolean;
  onClose: () => void;
  bookmarkId: string;
  version: SchemaVersionDto;
  jobs: UseQueryResult<PredictionJobDto[]>;
};

/** The bookmark's bulk uploads: start one from a file, and follow, cancel or retry each. */
export function BulkJobsDialog({ open, onClose, bookmarkId, version, jobs }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const upload = useBulkJobUpload(bookmarkId, version);

  const choose = () => {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload.start(file);
  };
  const items = jobs.data ?? [];

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Bulk uploads"
      description={`Each upload of up to ${MAX_BULK_ROWS} CSV or XLSX rows runs on the server and goes on if you close this tab. Every row is saved to the bookmark's history.`}
    >
      <input
        ref={inputRef}
        aria-label="Upload schema run file"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={handleFile}
      />
      <div className="flex flex-col gap-4">
        <div>
          <AppButton type="button" onClick={choose} disabled={upload.preparing}>
            {upload.preparing ? <AppSpinner size={16} /> : <Upload size={16} />}
            {upload.preparing ? "Preparing rows…" : "Upload a file"}
          </AppButton>
        </div>
        {jobs.isError ? (
          <AppEmptyState
            compact
            title="Bulk uploads unavailable"
            description="The bookmark's bulk uploads could not be loaded."
          />
        ) : jobs.isLoading ? (
          <AppLoadingState compact label="Loading bulk uploads…" />
        ) : items.length === 0 ? (
          <AppEmptyState
            compact
            title="No bulk uploads yet"
            description="Upload a file to run its rows on the server."
          />
        ) : (
          <ol className="flex flex-col">
            {items.map((job) => (
              <BulkJobEntry key={job.id} bookmarkId={bookmarkId} job={job} />
            ))}
          </ol>
        )}
      </div>
    </AppDialog>
  );
}
