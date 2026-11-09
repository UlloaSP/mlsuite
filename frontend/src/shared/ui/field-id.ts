/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createContext, useContext } from "react";

/** The id `AppFieldLabel`'s label points at, which the field control inside it takes. */
export const FieldIdContext = createContext<string | undefined>(undefined);

/** A control's id: the one it was given, or its field label's, so that label names it. */
export const useFieldId = (id?: string) => {
  const fieldId = useContext(FieldIdContext);
  return id ?? fieldId;
};
