/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { useEditorAtoms } from "@/features/schemas/lib/editor-atoms";
import { EditorErrorCard } from "./EditorErrorCard";

export function EditorErrorPanel() {
  const schemaErrors = useSelector(useEditorAtoms().schemaErrors);

  return (
    // Fades in as the footer opens; closing collapses the footer over it.
    <div className="flex-1 overflow-y-auto rounded-b-card border border-t-0 border-line bg-surface transition-opacity duration-(--duration-base) starting:opacity-0 motion-reduce:transition-none">
      <div className="space-y-3 p-4">
        {schemaErrors.map((error) => (
          <EditorErrorCard key={JSON.stringify(error)} error={error} />
        ))}
      </div>
    </div>
  );
}
