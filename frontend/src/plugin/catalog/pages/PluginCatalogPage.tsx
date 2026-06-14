/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Upload } from "lucide-react";
import { useSetAtom } from "jotai";
import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "../../../app/components";
import { NotFoundError } from "../../../app/pages/error-page";
import { useUser } from "../../../user/hooks";
import { useWorkspaceContext } from "../../../workspace/hooks";
import { PluginCatalogListPanel } from "../components/PluginCatalogListPanel";
import { PluginCatalogStatsPanel } from "../components/PluginCatalogStatsPanel";
import { PluginCatalogToolbar } from "../components/PluginCatalogToolbar";
import { useUploadPluginMutation } from "../hooks/usePluginCatalogPageData";
import { TYPE_META, readFileText } from "../plugin-catalog-shared";
import type { SortMode, TypeFilter } from "../plugin-catalog-shared";
import { invalidateCustomFieldDefinitions } from "../../mlform/custom-field";
import { invalidateCustomReportDefinitions } from "../../mlform/custom-report";
import { detectPluginType, invalidatePluginCatalog } from "../../mlform/plugin-catalog";
import { bumpPluginCatalogVersionAtom } from "../../mlform/plugin-catalog-state";

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- Filters, menu state, upload busy state, and catalog rows are independent UI controls.
export function PluginCatalogPage() {
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const organizationId = workspace?.currentOrganization.id;
  const canManagePlugins = workspace?.permissions.canManagePlugins ?? false;
  const bumpPluginCatalogVersion = useSetAtom(bumpPluginCatalogVersionAtom);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const uploadMutation = useUploadPluginMutation();
  const pushToast = (tone: "success" | "error", message: string) => toast[tone](message);

  useEffect(() => {
    setPage(0);
  }, [organizationId]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const refreshPluginRuntime = async () => {
    invalidatePluginCatalog();
    invalidateCustomFieldDefinitions();
    invalidateCustomReportDefinitions();
    bumpPluginCatalogVersion();
  };

  const handleQueryChange = (value: string) => {
    setPage(0);
    setQuery(value);
  };

  const handleSortChange = (value: SortMode) => {
    setPage(0);
    setSort(value);
  };

  const handleTypeFilterChange = (value: TypeFilter) => {
    setPage(0);
    setTypeFilter(value);
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const source = await readFileText(file);
      const detected = await detectPluginType(source);
      await uploadMutation.mutateAsync(file);
      setPage(0);
      await refreshPluginRuntime();
      pushToast(
        "success",
        `${file.name} uploaded as ${TYPE_META[detected.pluginType].shortLabel} "${detected.kind}".`,
      );
    } catch (uploadError: unknown) {
      pushToast("error", uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      event.target.value = "";
    }
  };

  if (!user || error) {
    return <NotFoundError />;
  }
  if (workspace && !workspace.permissions.canViewPlugins) {
    return <NotFoundError />;
  }

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          eyebrow="Plugin Catalog"
          title={<span>Plugins</span>}
          description={`Unified catalog for MLForm plugins in ${workspace?.currentOrganization.name ?? "the current workspace"}. Use type filter, search, and sort to manage plugin files in one place.`}
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Plugins" }]}
          actions={
            canManagePlugins ? (
              <AppButton
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload size={16} />
                Upload Plugin
              </AppButton>
            ) : null
          }
        />
        <PluginCatalogStatsPanel organizationId={organizationId} />
        <PluginCatalogToolbar
          inputRef={inputRef}
          isSortOpen={isSortOpen}
          onFileSelection={(event) => {
            void handleFileSelection(event);
          }}
          query={query}
          setIsSortOpen={setIsSortOpen}
          setQuery={handleQueryChange}
          setSort={handleSortChange}
          setTypeFilter={handleTypeFilterChange}
          sort={sort}
          sortMenuRef={sortMenuRef}
          typeFilter={typeFilter}
        />
        <PluginCatalogListPanel
          canManagePlugins={canManagePlugins}
          isUploadPending={uploadMutation.isPending}
          onCatalogChanged={refreshPluginRuntime}
          organizationId={organizationId}
          page={page}
          search={deferredQuery}
          setPage={setPage}
          sort={sort}
          typeFilter={typeFilter}
        />
      </AppSurface>
    </AppPage>
  );
}
