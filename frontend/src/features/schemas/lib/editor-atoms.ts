/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import type { SchemaMappingIssueDto } from "@/shared/api/openapi.gen";
import { mappingIssueCards } from "./schema-mapping-issues";
import type { EditorErrorCard } from "./schema-diagnostics";

export const schemaTextAtom = atom<string>("");
export const schemaAtom = atom<unknown>(null);
/** What the editor itself finds: JSON, MLForm and plugin checks. */
export const editorCheckErrorsAtom = atom<EditorErrorCard[]>([]);
/** The mappings the server refused at the last save; cleared when a save succeeds. */
export const schemaMappingIssuesAtom = atom<SchemaMappingIssueDto[]>([]);
/** Every error of the schema being edited, placed in its current text. */
export const schemaErrorsAtom = atom<EditorErrorCard[]>((get) => [
  ...get(editorCheckErrorsAtom),
  ...mappingIssueCards(get(schemaTextAtom), get(schemaMappingIssuesAtom)),
]);
