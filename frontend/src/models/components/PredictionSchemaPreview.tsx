/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { schemaTextAtom } from "../../editor/atoms";

export function PredictionSchemaPreview() {
  const [schemaText] = useAtom(schemaTextAtom);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <AppPanel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="space-y-2 border-b border-[var(--border-soft)] pb-4">
          <AppSectionTitle>Schema</AppSectionTitle>
          <AppCopy>
            Read-only preview. To change UI fields, create a new schema version first.
          </AppCopy>
        </div>
        <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-[18px] bg-[var(--surface-muted)] p-4 font-mono text-sm text-[var(--text-primary)]">
          {schemaText}
        </pre>
      </AppPanel>
    </div>
  );
}
