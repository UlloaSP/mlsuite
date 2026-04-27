/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowUpDown, Check, ChevronDown, Power, Search, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { deactivateAllPlugins, deletePlugin, getPlugins, uploadPlugin, activatePlugin, deactivatePlugin } from "../api/pluginService";
import { AppButton, AppPage, AppPageHeader, AppPanel, AppSelect, AppSurface, AppTextField, cx } from "../components";
import { detectPluginType, invalidatePluginCatalog } from "../utils/mlform/plugin-catalog";
import { bumpPluginCatalogVersionAtom } from "../utils/mlform/plugin-catalog-state";
import { useUser } from "../../user/hooks";
import { NotFoundError } from "./error-page";
import { PluginCatalogListItem } from "./PluginCatalogListItem";
import { SORT_LABELS, TYPE_META, readFileText } from "./plugin-catalog-shared";
import type { FilterMode, PluginPageItem, SortMode, TypeFilter } from "./plugin-catalog-shared";

const enrichPlugin = async (item: PluginPageItem | Awaited<ReturnType<typeof getPlugins>>[number]): Promise<PluginPageItem> => {
	try {
		const detected = await detectPluginType(item.source);
		return { ...item, kind: detected.kind, pluginType: detected.pluginType, uniqueKey: `${detected.pluginType}:${item.id}` };
	} catch {
		return { ...item, kind: null, pluginType: "invalid", uniqueKey: `invalid:${item.id}` };
	}
};

export function PluginCatalogPage() {
	const { data: user, error } = useUser();
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
	}, []);

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

	if (!user || error) {
		return <NotFoundError />;
	}

	const reloadCatalog = async () => {
		invalidatePluginCatalog();
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
			pushToast("success", `${file.name} uploaded as ${TYPE_META[detected.pluginType].shortLabel} "${detected.kind}".`);
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
			pushToast("success", `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) ${item.active ? "deactivated" : "activated"}.`);
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
			pushToast("success", `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) deleted from catalog.`);
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
			pushToast("error", deactivateError instanceof Error ? deactivateError.message : String(deactivateError));
		} finally {
			setIsBusy(false);
		}
	};

	const normalizedQuery = query.trim().toLowerCase();
	const filteredItems = useMemo(() => items
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
			return item.fileName.toLowerCase().includes(normalizedQuery) || (item.kind ?? "").toLowerCase().includes(normalizedQuery);
		})
		.sort((left, right) => sort === "name"
			? left.fileName.localeCompare(right.fileName, undefined, { sensitivity: "base" })
			: sort === "size"
				? right.sizeBytes - left.sizeBytes
				: new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()), [filter, items, normalizedQuery, sort, typeFilter]);

	const activeCount = items.filter((item) => item.active).length;
	const selectedTypeItems = typeFilter === "all" ? items : items.filter((item) => item.pluginType === typeFilter);
	const selectedTypeActiveCount = selectedTypeItems.filter((item) => item.active).length;

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
					<AppPageHeader eyebrow="Plugin Catalog" title={<span>Plugins</span>} description="Unified catalog for MLForm plugins. Use type filter, status, and search to manage plugin lifecycle in one place." aside={<><AppButton type="button" onClick={handleDeactivateAll} disabled={isBusy || selectedTypeActiveCount === 0} variant="secondary"><Power size={15} />Deactivate All</AppButton><AppButton type="button" onClick={() => inputRef.current?.click()} disabled={isBusy}><Upload size={16} />Upload Plugin</AppButton></>} />
					<AppPanel className="grid gap-3">
						<input ref={inputRef} type="file" accept=".ts,text/typescript,application/typescript,text/plain" className="hidden" onChange={(event) => { void handleFileSelection(event); }} />
						<div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
							<AppTextField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by file or kind" prefix={<Search size={16} className="text-[var(--text-muted)]" />} />
							<AppSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} aria-label="Filter by plugin type">
								<option value="all">All types</option>
								<option value="field">Fields</option>
								<option value="report">Reports</option>
								<option value="explanation">Explanations</option>
							</AppSelect>
							<div className="flex flex-wrap items-center gap-2">{([["all", "All"], ["active", "Active"], ["inactive", "Inactive"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={cx("rounded-full px-4 py-3 text-sm font-medium transition", filter === value ? "bg-[var(--text-primary)] text-[var(--text-inverse)]" : "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]")}>{label}</button>)}</div>
							<div ref={sortMenuRef} className="relative">
								<button type="button" onClick={() => setIsSortOpen((current) => !current)} className="inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:border-[var(--text-primary)]" aria-haspopup="listbox" aria-expanded={isSortOpen}>
									<span className="inline-flex items-center gap-3"><ArrowUpDown size={15} className="text-[var(--text-muted)]" />{SORT_LABELS[sort]}</span>
									<ChevronDown size={16} className={cx("text-[var(--text-secondary)] transition", isSortOpen && "rotate-180")} />
								</button>
								{isSortOpen ? <div role="listbox" className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-[220px] overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">{(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(([value, label]) => <button key={value} type="button" role="option" aria-selected={sort === value} onClick={() => { setSort(value); setIsSortOpen(false); }} className={cx("flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition", sort === value ? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]" : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]")}><span>{label}</span>{sort === value ? <Check size={15} /> : null}</button>)}</div> : null}
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-[var(--text-secondary)]">
							<p className="font-medium text-[var(--text-primary)]">{filter === "active" ? `Showing ${selectedTypeActiveCount} active plugin${selectedTypeActiveCount !== 1 ? "s" : ""}${typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`}.` : filter === "inactive" ? `Showing ${selectedTypeItems.length - selectedTypeActiveCount} inactive plugin${selectedTypeItems.length - selectedTypeActiveCount !== 1 ? "s" : ""}${typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`}.` : `Showing ${selectedTypeItems.length} plugin${selectedTypeItems.length !== 1 ? "s" : ""}${typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`}.`}</p>
							<p>{activeCount === 0 ? "No active plugins. Runtime skips inactive custom kinds." : "Active plugins register native kinds before form mount."}</p>
						</div>
					</AppPanel>
					<section className="min-h-0 flex-1 overflow-auto">
						<div className="space-y-3">
							{filteredItems.length === 0 ? <AppPanel className="border-dashed px-6 py-16 text-center text-sm text-[var(--text-secondary)]">No plugins match current search/filter.</AppPanel> : filteredItems.map((item, index) => <PluginCatalogListItem key={item.uniqueKey} index={index} isBusy={isBusy} item={item} onDelete={handleDelete} onToggle={handleToggle} />)}
						</div>
					</section>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
