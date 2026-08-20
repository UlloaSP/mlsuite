/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileDown } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { buildSchemaRunExport } from "@/features/schemas/lib/export";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { SchemaRunExportDialog } from "./SchemaRunExportDialog";

type Props = {
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
};

export function SchemaRunExportButton({ runs, version }: Props) {
  const [open, setOpen] = useState(false);
  const hasData = buildSchemaRunExport(runs, version).content.length > 0;
  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={runs.length === 0 || !hasData}
        onClick={() => setOpen(true)}
      >
        <FileDown size={16} />
        Export to CSV
      </AppButton>
      <SchemaRunExportDialog
        open={open}
        runs={runs}
        version={version}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
