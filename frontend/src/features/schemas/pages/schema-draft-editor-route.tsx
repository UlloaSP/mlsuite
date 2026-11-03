import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { EditorAtomsProvider, createEditorAtoms } from "@/features/schemas/lib/editor-atoms";
import { SchemaDraftEditorPage } from "./schema-draft-editor-page";

export function SchemaDraftEditorRoute() {
  const { draftId } = useParams({ strict: false });
  const atoms = useMemo(() => createEditorAtoms(), [draftId]);
  return (
    <EditorAtomsProvider value={atoms}>
      <SchemaDraftEditorPage />
    </EditorAtomsProvider>
  );
}
