/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LoaderCircle, Square, Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { AppButton } from "../../app/components";
import { useBulkPredictionUpload } from "../useBulkPredictionUpload";

type BulkUploadButtonProps = {
  signatureId: string;
  modelId: string;
  signatureSchema: unknown;
};

export function BulkUploadButton({ signatureId, modelId, signatureSchema }: BulkUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bulk = useBulkPredictionUpload();

  const openPicker = () => {
    inputRef.current?.click();
  };

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleBulkUploadPress = () => {
    if (bulk.status === "processing" || bulk.status === "parsing") {
      bulk.cancel();
      return;
    }

    if (bulk.status === "done") {
      bulk.reset();
    }

    clearInput();
    openPicker();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void bulk.start(file, { signatureId, modelId, signatureSchema });
  };

  const processing = bulk.status === "processing" || bulk.status === "parsing";
  const label = (() => {
    if (bulk.status === "parsing") {
      return "Parsing…";
    }
    if (bulk.status === "processing") {
      return `Bulk ${bulk.processed}/${bulk.total}`;
    }
    if (bulk.status === "done") {
      return `${bulk.saved} saved`;
    }
    return "Bulk Upload";
  })();

  const icon =
    bulk.status === "parsing" ? (
      <LoaderCircle size={16} className="animate-spin" />
    ) : bulk.status === "processing" ? (
      <Square size={14} className="fill-current" />
    ) : (
      <Upload size={16} />
    );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={handleFileChange}
      />
      <AppButton
        type="button"
        variant="secondary"
        onClick={handleBulkUploadPress}
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
