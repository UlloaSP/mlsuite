import { createStore, Provider } from "jotai";
import { useMemo } from "react";
import { useParams } from "react-router";
import { SchemaDraftEditorPage } from "./schema-draft-editor-page";

export function SchemaDraftEditorRoute() {
  const { draftId } = useParams<{ draftId: string }>();
  const store = useMemo(() => createStore(), [draftId]);
  return (
    <Provider store={store}>
      <SchemaDraftEditorPage />
    </Provider>
  );
}
