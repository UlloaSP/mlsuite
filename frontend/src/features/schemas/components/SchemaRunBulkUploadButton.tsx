/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Square, Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { useSchemaRunBulkUpload } from "@/features/schemas/lib/use-schema-run-bulk-upload";

import { bulkUploadSummary } from "@/features/schemas/lib/bulk-upload";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";
import type { useInferenceSession } from "@/features/schemas/lib/use-inference-session";

type Props = {
  version: SchemaVersionDto;
  onResult: ReturnType<typeof useInferenceSession>["addResult"];
};

export function SchemaRunBulkUploadButton({ version, onResult }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bulk = useSchemaRunBulkUpload(version, onResult);
  const summary = bulkUploadSummary(
    bulk.added,
    bulk.failed,
    bulk.skipped,
    Math.max(0, bulk.total - bulk.processed),
  );
  const processing = bulk.status === "processing" || bulk.status === "parsing";
  const label =
    bulk.status === "parsing"
      ? "Parsing…"
      : bulk.status === "processing"
        ? `Bulk ${bulk.processed}/${bulk.total}`
        : bulk.status === "done"
          ? summary.message
          : "Bulk upload";
  const icon =
    bulk.status === "parsing" ? (
      <AppSpinner size={16} />
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
              : "Add up to 10000 CSV or XLSX records to the session. Review them before saving."
        }
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        {processing ? (
          <span className="text-2xs font-semibold uppercase tracking-eyebrow text-danger-fg">
            Stop
          </span>
        ) : bulk.status === "done" ? (
          <span className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
            Again
          </span>
        ) : null}
      </AppButton>
    </>
  );
}
