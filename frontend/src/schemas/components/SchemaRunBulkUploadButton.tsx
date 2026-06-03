/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LoaderCircle, Square, Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { AppButton } from "../../app/components/ui-controls";
import { useSchemaRunBulkUpload } from "../useSchemaRunBulkUpload";
import type { SchemaVersionDto } from "../types";

type Props = {
  version: SchemaVersionDto;
};

export function SchemaRunBulkUploadButton({ version }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bulk = useSchemaRunBulkUpload(version);
  const processing = bulk.status === "processing" || bulk.status === "parsing";
  const label =
    bulk.status === "parsing"
      ? "Parsing..."
      : bulk.status === "processing"
        ? `Bulk ${bulk.processed}/${bulk.total}`
        : bulk.status === "done"
          ? `${bulk.saved} saved`
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
            ? `${bulk.saved} saved, ${bulk.failed} failed, ${bulk.skipped} skipped. Click to upload another file.`
            : processing
              ? `Processing ${bulk.processed} of ${bulk.total}. Click to cancel.`
              : "Upload a CSV or XLSX file with up to 10000 records."
        }
        className="min-w-[168px] justify-between"
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
