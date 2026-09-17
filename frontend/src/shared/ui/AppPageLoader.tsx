import { AppPage } from "./AppPage";
import { EditorAssemblyLoader } from "./EditorAssemblyLoader";

export function AppPageLoader({ label }: { label: string }) {
  return (
    <AppPage>
      <EditorAssemblyLoader label={label} />
    </AppPage>
  );
}
