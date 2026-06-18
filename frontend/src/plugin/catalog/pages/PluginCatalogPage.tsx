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
import { PluginCatalogBrowser } from "../components/PluginCatalogBrowser";
import { useUploadPluginMutation } from "../hooks/usePluginCatalogPageData";
import { TYPE_META, readFileText } from "../../../algorithms/plugin/catalog-page-model";
import type { SortMode, TypeFilter } from "../../../algorithms/plugin/catalog-page-model";
import { invalidateCustomFieldDefinitions } from "../../../algorithms/plugin/custom-field-catalog";
import { invalidateCustomReportDefinitions } from "../../../algorithms/plugin/custom-report-catalog";
import { detectPluginType, invalidatePluginCatalog } from "../../../algorithms/plugin/catalog-loader";
import { bumpPluginCatalogVersionAtom } from "../../mlform/plugin-catalog-state";

export function PluginCatalogPage() {
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const organizationId = workspace?.currentOrganization.id;
  const canManagePlugins = workspace?.permissions.canManagePlugins ?? false;
  const bumpPluginCatalogVersion = useSetAtom(bumpPluginCatalogVersionAtom);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const uploadMutation = useUploadPluginMutation();
  const pushToast = (tone: "success" | "error", message: string) => toast[tone](message);

  useEffect(() => {
    setPage(0);
  }, [organizationId]);

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
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader
          eyebrow="Workspace Extensions"
          title={<span>Plugins</span>}
          description="View and manage workspace plugins that extend MLForm with custom field and report renderers."
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
        <PluginCatalogBrowser
          toolbar={{
            inputRef,
            onFileSelection: (event) => {
              void handleFileSelection(event);
            },
            organizationId,
            page,
            query,
            search: deferredQuery,
            setQuery: handleQueryChange,
            setSort: handleSortChange,
            setTypeFilter: handleTypeFilterChange,
            sort,
            typeFilter,
          }}
          list={{
            canManagePlugins,
            isUploadPending: uploadMutation.isPending,
            onCatalogChanged: refreshPluginRuntime,
            organizationId,
            page,
            search: deferredQuery,
            setPage,
            sort,
            typeFilter,
          }}
        />
      </AppSurface>
    </AppPage>
  );
}
