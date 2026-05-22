/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useState } from "react";
import { AppPage, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page.tsx";
import { invalidatePluginCatalog } from "../../app/utils/mlform/plugin-catalog.ts";
import { EditorWrapper } from "../../editor/components/EditorWrapper.tsx";
import { useUser } from "../../user/hooks.ts";
import { CreateSignatureActionSection } from "../components/CreateSignatureActionSection.tsx";
import { CreateSignatureHeader } from "../components/CreateSignatureHeader.tsx";

export function CreateSignaturePage() {
  const { data: user, error } = useUser();
  const [isCatalogReady, setIsCatalogReady] = useState(false);

  useEffect(() => {
    invalidatePluginCatalog();
    setIsCatalogReady(true);
  }, []);
  if (!user || error) return <NotFoundError />;
  return (
    <AppPage>
      <AppSurface className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden">
        <div className="space-y-6">
          <CreateSignatureHeader />
          <CreateSignatureActionSection />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {isCatalogReady ? <EditorWrapper /> : null}
        </div>
      </AppSurface>
    </AppPage>
  );
}
