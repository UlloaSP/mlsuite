import { useMemo } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { EditorAtomsProvider, createEditorAtoms } from "@/features/schemas/lib/editor-atoms";
import { SchemaDraftEditorPage } from "./schema-draft-editor-page";

const route = getRouteApi("/protected/app/can-edit-models/schemas/$schemaId/drafts/$draftId");

export function SchemaDraftEditorRoute() {
  const { draftId } = route.useParams();
  const atoms = useMemo(() => createEditorAtoms(), [draftId]);
  return (
    <EditorAtomsProvider value={atoms}>
      <SchemaDraftEditorPage />
    </EditorAtomsProvider>
  );
}
