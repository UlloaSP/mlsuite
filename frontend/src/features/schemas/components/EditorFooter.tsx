/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { useEditorAtoms } from "@/features/schemas/lib/editor-atoms";
import { EditorErrorBar } from "./EditorErrorBar";
import { EditorErrorPanel } from "./EditorErrorPanel";

export function EditorFooter() {
  const schemaErrors = useSelector(useEditorAtoms().schemaErrors);
  const [expandedRequested, setExpandedRequested] = useState(false);
  const expanded = expandedRequested && schemaErrors.length > 0;

  return (
    <div
      className={`z-30 flex w-full shrink-0 flex-col transition-[height] duration-(--duration-base) ease-(--ease-emphasized) motion-reduce:transition-none ${
        expanded ? "h-[30vh]" : "h-8"
      }`}
    >
      <EditorErrorBar expanded={expanded} setExpanded={setExpandedRequested} />
      {expanded && <EditorErrorPanel />}
    </div>
  );
}
