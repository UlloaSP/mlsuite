/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LoaderCircle, Square, Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { useSchemaRunBulkUpload } from "@/features/schemas/lib/use-schema-run-bulk-upload";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

import { bulkUploadSummary } from "@/features/schemas/lib/bulk-upload";

type Props = {
  version: SchemaVersionDto;
  bookmarkId: string;
};

export function SchemaRunBulkUploadButton({ version, bookmarkId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bulk = useSchemaRunBulkUpload(version, bookmarkId);
  const summary = bulkUploadSummary(
    bulk.saved,
    bulk.failed,
    bulk.skipped,
    Math.max(0, bulk.total - bulk.processed),
  );
  const processing = bulk.status === "processing" || bulk.status === "parsing";
  const label =
    bulk.status === "parsing"
      ? "Parsing..."
      : bulk.status === "processing"
        ? `Bulk ${bulk.processed}/${bulk.total}`
        : bulk.status === "done"
          ? summary.message
          : "Bulk Upload";
  const icon =
    bulk.status === "parsing" ? (
      <LoaderCircle size={16} className="animate-spin" />
    ) : bulk.status === "processing" ? (
      <Square size={14} className="fill-current" />
    ) : (
      <Upload size={16} />
    );

  const handlePress = () => {
    if (processing) {
      bulk.cancel();
      return;
    }
    if (bulk.status === "done") bulk.reset();
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void bulk.start(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        aria-label="Upload schema run file"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={handleFile}
      />
      <AppButton
        type="button"
        variant="secondary"
        onClick={handlePress}
        title={
          bulk.status === "done"
            ? `${summary.message}. Click to upload another file.`
            : processing
              ? `Processing ${bulk.processed} of ${bulk.total}. Click to cancel.`
              : "Upload a CSV or XLSX file with up to 10000 records."
        }
        className="justify-between"
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        {processing ? (
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--danger-text)]">
            Stop
          </span>
        ) : bulk.status === "done" ? (
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Again
          </span>
        ) : null}
      </AppButton>
    </>
  );
}
