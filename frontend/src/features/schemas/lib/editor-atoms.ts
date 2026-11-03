/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createAtom, createStoreContext } from "@tanstack/react-store";
import type { SchemaMappingIssueDto } from "@/shared/api/openapi.gen";
import { mappingIssueCards } from "./schema-mapping-issues";
import type { EditorErrorCard } from "./schema-diagnostics";

/** The state of one draft's editor; each draft gets its own, so nothing leaks between drafts. */
export function createEditorAtoms() {
  const schemaText = createAtom<string>("");
  const schema = createAtom<unknown>(null);
  /** What the editor itself finds: JSON, MLForm and plugin checks. */
  const editorCheckErrors = createAtom<EditorErrorCard[]>([]);
  /** The mappings the server refused at the last save; cleared when a save succeeds. */
  const schemaMappingIssues = createAtom<SchemaMappingIssueDto[]>([]);
  /** Every error of the schema being edited, placed in its current text. */
  const schemaErrors = createAtom<EditorErrorCard[]>(() => [
    ...editorCheckErrors.get(),
    ...mappingIssueCards(schemaText.get(), schemaMappingIssues.get()),
  ]);
  return { schemaText, schema, editorCheckErrors, schemaMappingIssues, schemaErrors };
}

export const { StoreProvider: EditorAtomsProvider, useStoreContext: useEditorAtoms } =
  createStoreContext<ReturnType<typeof createEditorAtoms>>();
