/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Power, Upload } from "lucide-react";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  deactivateAllPlugins,
  deletePlugin,
  getPlugins,
  uploadPlugin,
  activatePlugin,
  deactivatePlugin,
} from "../api/pluginService";
import {
  AppButton,
} from "../components/ui-controls";
import {
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSurface,
} from "../components/ui";
import { invalidateActiveCustomFieldDefinition } from "../utils/mlform/custom-field";
import { invalidateActiveCustomReportDefinition } from "../utils/mlform/custom-report";
import { detectPluginType, invalidatePluginCatalog } from "../utils/mlform/plugin-catalog";
import { bumpPluginCatalogVersionAtom } from "../utils/mlform/plugin-catalog-state";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import { NotFoundError } from "./error-page";
import { PluginCatalogListItem } from "./PluginCatalogListItem";
import { PluginCatalogToolbar } from "./PluginCatalogToolbar";
import { enrichPlugin } from "./plugin-catalog-data";
import { TYPE_META, readFileText } from "./plugin-catalog-shared";
import type { FilterMode, PluginPageItem, SortMode, TypeFilter } from "./plugin-catalog-shared";

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- Filters, menu state, upload busy state, and catalog rows are independent UI controls.
export function PluginCatalogPage() {
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<PluginPageItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const bumpPluginCatalogVersion = useSetAtom(bumpPluginCatalogVersionAtom);
  const pushToast = (tone: "success" | "error", message: string) => toast[tone](message);

  const refreshItems = async (): Promise<PluginPageItem[]> => {
    const raw = await getPlugins();
    const enriched = await Promise.all(raw.map((item) => enrichPlugin(item)));
    setItems(enriched);
    return enriched;
  };

  useEffect(() => {
    void refreshItems().catch((loadError: unknown) => {
      pushToast("error", loadError instanceof Error ? loadError.message : String(loadError));
    });
  }, [workspace?.currentOrganization.id]);

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

  const canManagePlugins = workspace?.permissions.canManagePlugins ?? false;

  const reloadCatalog = async () => {
    invalidatePluginCatalog();
    invalidateActiveCustomFieldDefinition();
    invalidateActiveCustomReportDefinition();
    bumpPluginCatalogVersion();
    await refreshItems();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsBusy(true);
    try {
      const source = await readFileText(file);
      const detected = await detectPluginType(source);
      await uploadPlugin(file);
      await reloadCatalog();
      pushToast(
        "success",
        `${file.name} uploaded as ${TYPE_META[detected.pluginType].shortLabel} "${detected.kind}".`,
      );
    } catch (uploadError: unknown) {
      pushToast("error", uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setIsBusy(false);
      event.target.value = "";
    }
  };

  const handleToggle = async (item: PluginPageItem) => {
    setIsBusy(true);
    try {
      if (item.active) {
        await deactivatePlugin(item.id);
      } else {
        await activatePlugin(item.id);
      }
      await reloadCatalog();
      pushToast(
        "success",
        `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) ${item.active ? "deactivated" : "activated"}.`,
      );
    } catch (toggleError: unknown) {
      pushToast("error", toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (item: PluginPageItem) => {
    setIsBusy(true);
    try {
      await deletePlugin(item.id);
      await reloadCatalog();
      pushToast(
        "success",
        `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) deleted from catalog.`,
      );
    } catch (deleteError: unknown) {
      pushToast("error", deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeactivateAll = async () => {
    if (!items.some((item) => item.active)) {
      return;
    }
    setIsBusy(true);
    try {
      await deactivateAllPlugins();
      await reloadCatalog();
      const scope = typeFilter === "all" ? "all plugin types" : TYPE_META[typeFilter].plural;
      pushToast("success", `All active ${scope} were deactivated.`);
    } catch (deactivateError: unknown) {
      pushToast(
        "error",
        deactivateError instanceof Error ? deactivateError.message : String(deactivateError),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => {
          if (typeFilter !== "all" && item.pluginType !== typeFilter) {
            return false;
          }
          if (filter === "active" && !item.active) {
            return false;
          }
          if (filter === "inactive" && item.active) {
            return false;
          }
          if (normalizedQuery.length === 0) {
            return true;
          }
          return (
            item.fileName.toLowerCase().includes(normalizedQuery) ||
            (item.kind ?? "").toLowerCase().includes(normalizedQuery)
          );
        })
        .sort((left, right) =>
          sort === "name"
            ? left.fileName.localeCompare(right.fileName, undefined, { sensitivity: "base" })
            : sort === "size"
              ? right.sizeBytes - left.sizeBytes
              : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [filter, items, normalizedQuery, sort, typeFilter],
  );

  const activeCount = items.filter((item) => item.active).length;
  const selectedTypeItems =
    typeFilter === "all" ? items : items.filter((item) => item.pluginType === typeFilter);
  const selectedTypeActiveCount = selectedTypeItems.filter((item) => item.active).length;

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
          description={`Unified catalog for MLForm plugins in ${workspace?.currentOrganization.name ?? "the current workspace"}. Use type filter, status, and search to manage plugin lifecycle in one place.`}
          aside={
            canManagePlugins ? (
              <>
                <AppButton
                  type="button"
                  onClick={handleDeactivateAll}
                  disabled={isBusy || selectedTypeActiveCount === 0}
                  variant="secondary"
                >
                  <Power size={15} />
                  Deactivate All
                </AppButton>
                <AppButton
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isBusy}
                >
                  <Upload size={16} />
                  Upload Plugin
                </AppButton>
              </>
            ) : null
          }
        />
        <PluginCatalogToolbar
          activeCount={activeCount}
          filter={filter}
          inputRef={inputRef}
          isSortOpen={isSortOpen}
          onFileSelection={(event) => {
            void handleFileSelection(event);
          }}
          query={query}
          selectedTypeActiveCount={selectedTypeActiveCount}
          selectedTypeCount={selectedTypeItems.length}
          setFilter={setFilter}
          setIsSortOpen={setIsSortOpen}
          setQuery={setQuery}
          setSort={setSort}
          setTypeFilter={setTypeFilter}
          sort={sort}
          sortMenuRef={sortMenuRef}
          typeFilter={typeFilter}
        />
        <section className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <AppPanel className="border-dashed px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
                No plugins match current search/filter.
              </AppPanel>
            ) : (
              filteredItems.map((item, index) => (
                <PluginCatalogListItem
                  key={item.uniqueKey}
                  canManage={canManagePlugins}
                  index={index}
                  isBusy={isBusy}
                  item={item}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        </section>
      </AppSurface>
    </AppPage>
  );
}
