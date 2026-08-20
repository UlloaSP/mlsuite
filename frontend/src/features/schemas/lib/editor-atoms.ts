/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import type { EditorErrorCard } from "./schema-diagnostics";

export const schemaTextAtom = atom<string>("");
export const schemaAtom = atom<unknown>(null);
export const schemaErrorsAtom = atom<EditorErrorCard[]>([]);
