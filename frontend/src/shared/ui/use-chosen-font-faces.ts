/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { useEffect } from "react";
import { loadFontFaces } from "./font-faces";
import { typographyAtom } from "./typography-state";

/** Fetches the faces of the interface and monospace fonts the member chose, when they change. */
export function useChosenFontFaces() {
  const interfaceFont = useSelector(typographyAtom, (typography) => typography.interfaceFont);
  const monospaceFont = useSelector(typographyAtom, (typography) => typography.monospaceFont);
  useEffect(() => {
    void loadFontFaces([interfaceFont, monospaceFont]);
  }, [interfaceFont, monospaceFont]);
}
