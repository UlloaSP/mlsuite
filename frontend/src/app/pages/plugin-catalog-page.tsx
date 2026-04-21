/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	ArrowUpDown,
	Check,
	ChevronDown,
	Power,
	Search,
	Trash2,
	Upload,
	XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useUser } from "../../user/hooks";
import {
	activateCustomExplanation,
	deactivateCustomExplanation,
	deleteCustomExplanation,
	getCustomExplanations,
	uploadCustomExplanation,
	type CustomExplanationDto,
} from "../api/customExplanationService";
import {
	activateCustomField,
	deactivateCustomField,
	deleteCustomField,
	getCustomFields,
	uploadCustomField,
	type CustomFieldDto,
} from "../api/customFieldService";
import {
	activateCustomReport,
	deactivateCustomReport,
	deleteCustomReport,
	getCustomReports,
	uploadCustomReport,
	type CustomReportDto,
} from "../api/customReportService";
import {
	AppBadge,
	AppButton,
	AppIconButton,
	AppPage,
	AppPageHeader,
	AppPanel,
	AppSelect,
	AppSurface,
	AppTextField,
	cx,
} from "../components";
import {
	getCatalogExplanationDefinitions,
	invalidateActiveCustomExplanationDefinition,
	validateCustomExplanationSource,
} from "../utils/mlform/custom-explanation";
import {
	getCatalogFieldDefinitions,
	invalidateActiveCustomFieldDefinition,
	validateCustomFieldSource,
} from "../utils/mlform/custom-field";
import {
	getCatalogReportDefinitions,
	invalidateActiveCustomReportDefinition,
	validateCustomReportSource,
} from "../utils/mlform/custom-report";
import { Unauthorized } from "./Unauthorized";

type FilterMode = "all" | "active" | "inactive";
type SortMode = "updated" | "name" | "size";
type PluginType = "field" | "report" | "explanation";
type TypeFilter = "all" | PluginType;
type ToastState = {
	tone: "success" | "error";
	message: string;
} | null;

type BasePluginItem = {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	source: string;
};

type PluginCatalogItem = BasePluginItem & {
	pluginType: PluginType;
	uniqueKey: string;
};

type TypeMeta = {
	label: string;
	shortLabel: string;
	tone: "accent" | "success" | "warning";
	plural: string;
};

const SORT_LABELS: Record<SortMode, string> = {
	updated: "Latest updated",
	name: "Name",
	size: "Size",
};

const TYPE_META: Record<PluginType, TypeMeta> = {
	field: {
		label: "Field",
		shortLabel: "field",
		tone: "accent",
		plural: "fields",
	},
	report: {
		label: "Report",
		shortLabel: "report",
		tone: "warning",
		plural: "reports",
	},
	explanation: {
		label: "Explanation",
		shortLabel: "explanation",
		tone: "success",
		plural: "explanations",
	},
};

const readFileText = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
		reader.onerror = () => reject(reader.error ?? new Error("Could not read selected file."));
		reader.readAsText(file);
	});

const formatTimestamp = (value: string): string => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatSize = (value: number): string => {
	if (value < 1024) {
		return `${value} B`;
	}

	if (value < 1024 * 1024) {
		return `${(value / 1024).toFixed(1)} KB`;
	}

	return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const toPluginItem = <TItem extends BasePluginItem>(
	item: TItem,
	pluginType: PluginType,
): PluginCatalogItem => ({
	...item,
	pluginType,
	uniqueKey: `${pluginType}:${item.id}`,
});

const BUILTIN_DEFAULT_ID = "builtin-default-plugin";

type SourceValidationResult =
	| { pluginType: "field"; kind: string }
	| { pluginType: "report"; kind: string }
	| { pluginType: "explanation"; kind: string };

const detectPluginType = async (source: string): Promise<SourceValidationResult> => {
	const attempts = await Promise.allSettled([
		validateCustomFieldSource(source),
		validateCustomReportSource(source),
		validateCustomExplanationSource(source),
	]);

	const field = attempts[0];
	if (field.status === "fulfilled") {
		return { pluginType: "field", kind: field.value.kind };
	}

	const report = attempts[1];
	if (report.status === "fulfilled") {
		return { pluginType: "report", kind: report.value.kind };
	}

	const explanation = attempts[2];
	if (explanation.status === "fulfilled") {
		return { pluginType: "explanation", kind: explanation.value.kind };
	}

	const reasons = attempts
		.map((attempt) =>
			attempt.status === "rejected"
				? attempt.reason instanceof Error
					? attempt.reason.message
					: String(attempt.reason)
				: null,
		)
		.filter((reason): reason is string => Boolean(reason));

	throw new Error(
		reasons.length > 0
			? `Plugin validation failed for field/report/explanation: ${reasons.join(" | ")}`
			: "Plugin validation failed. The file is not a valid field, report, or explanation plugin.",
	);
};

export function PluginCatalogPage() {
	const { data: user, error } = useUser();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const sortMenuRef = useRef<HTMLDivElement | null>(null);
	const [items, setItems] = useState<PluginCatalogItem[]>([]);
	const [isBusy, setIsBusy] = useState(false);
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<FilterMode>("all");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const [sort, setSort] = useState<SortMode>("updated");
	const [isSortOpen, setIsSortOpen] = useState(false);
	const [toast, setToast] = useState<ToastState>(null);
	const [definitionKinds, setDefinitionKinds] = useState<Record<string, string>>({});

	const pushToast = (tone: "success" | "error", message: string) => {
		setToast({ tone, message });
	};

	useEffect(() => {
		if (!toast) {
			return;
		}

		const timer = window.setTimeout(() => {
			setToast(null);
		}, 3200);

		return () => {
			window.clearTimeout(timer);
		};
	}, [toast]);

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

	const refreshItems = async (): Promise<PluginCatalogItem[]> => {
		const [fieldItems, reportItems, explanationItems, fieldDefs, reportDefs, explanationDefs] =
			await Promise.all([
				getCustomFields(),
				getCustomReports(),
				getCustomExplanations(),
				getCatalogFieldDefinitions(),
				getCatalogReportDefinitions(),
				getCatalogExplanationDefinitions(),
			]);

		const merged = [
			...fieldItems.map((item) => toPluginItem<CustomFieldDto>(item, "field")),
			...reportItems.map((item) => toPluginItem<CustomReportDto>(item, "report")),
			...explanationItems.map((item) =>
				toPluginItem<CustomExplanationDto>(item, "explanation"),
			),
		];

		const nextKinds: Record<string, string> = {};
		for (const definition of fieldDefs) {
			nextKinds[`field:${definition.id}`] = definition.kind;
		}
		for (const definition of reportDefs) {
			nextKinds[`report:${definition.id}`] = definition.kind;
		}
		for (const definition of explanationDefs) {
			nextKinds[`explanation:${definition.id}`] = definition.kind;
		}

		setDefinitionKinds(nextKinds);
		setItems(merged);
		return merged;
	};

	useEffect(() => {
		void (async () => {
			try {
				await refreshItems();
			} catch (loadError: unknown) {
				pushToast("error", loadError instanceof Error ? loadError.message : String(loadError));
			}
		})();
	}, []);

	if (!user || error) {
		return <Unauthorized />;
	}

	const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		setIsBusy(true);
		try {
			const source = await readFileText(file);
			const detected = await detectPluginType(source);
			switch (detected.pluginType) {
				case "field":
					await uploadCustomField(file);
					invalidateActiveCustomFieldDefinition();
					break;
				case "report":
					await uploadCustomReport(file);
					invalidateActiveCustomReportDefinition();
					break;
				case "explanation":
					await uploadCustomExplanation(file);
					invalidateActiveCustomExplanationDefinition();
					break;
			}
			await refreshItems();
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

	const handleToggle = async (item: PluginCatalogItem) => {
		setIsBusy(true);
		try {
			switch (item.pluginType) {
				case "field":
					if (item.active) {
						await deactivateCustomField(item.id);
					} else {
						await activateCustomField(item.id);
					}
					invalidateActiveCustomFieldDefinition();
					break;
				case "report":
					if (item.active) {
						await deactivateCustomReport(item.id);
					} else {
						await activateCustomReport(item.id);
					}
					invalidateActiveCustomReportDefinition();
					break;
				case "explanation":
					if (item.active) {
						await deactivateCustomExplanation(item.id);
					} else {
						await activateCustomExplanation(item.id);
					}
					invalidateActiveCustomExplanationDefinition();
					break;
			}
			await refreshItems();
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

	const handleDelete = async (item: PluginCatalogItem) => {
		setIsBusy(true);
		try {
			switch (item.pluginType) {
				case "field":
					await deleteCustomField(item.id);
					invalidateActiveCustomFieldDefinition();
					break;
				case "report":
					await deleteCustomReport(item.id);
					invalidateActiveCustomReportDefinition();
					break;
				case "explanation":
					await deleteCustomExplanation(item.id);
					invalidateActiveCustomExplanationDefinition();
					break;
			}
			await refreshItems();
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
		const candidates =
			typeFilter === "all" ? items : items.filter((item) => item.pluginType === typeFilter);

		if (!candidates.some((item) => item.active)) {
			return;
		}

		setIsBusy(true);
		try {
			const activeFields = candidates.filter((item) => item.pluginType === "field" && item.active);
			const activeReports = candidates.filter((item) => item.pluginType === "report" && item.active);
			const activeExplanations = candidates.filter(
				(item) => item.pluginType === "explanation" && item.active,
			);

			await Promise.all([
				...activeFields.map((item) => deactivateCustomField(item.id)),
				...activeReports.map((item) => deactivateCustomReport(item.id)),
				...activeExplanations.map((item) => deactivateCustomExplanation(item.id)),
			]);

			if (activeFields.length > 0) {
				invalidateActiveCustomFieldDefinition();
			}
			if (activeReports.length > 0) {
				invalidateActiveCustomReportDefinition();
			}
			if (activeExplanations.length > 0) {
				invalidateActiveCustomExplanationDefinition();
			}

			await refreshItems();
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
	const filteredItems = useMemo(() => {
		return items
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

				const definitionKind = definitionKinds[item.uniqueKey] ?? "";
				return (
					item.fileName.toLowerCase().includes(normalizedQuery) ||
					definitionKind.toLowerCase().includes(normalizedQuery)
				);
			})
			.sort((left, right) => {
				switch (sort) {
					case "name":
						return left.fileName.localeCompare(right.fileName, undefined, { sensitivity: "base" });
					case "size":
						return right.sizeBytes - left.sizeBytes;
					case "updated":
					default:
						return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
				}
			});
	}, [items, typeFilter, filter, normalizedQuery, definitionKinds, sort]);

	const activeCount = items.filter((item) => item.active).length;
	const selectedTypeCount =
		typeFilter === "all"
			? items.length
			: items.filter((item) => item.pluginType === typeFilter).length;
	const selectedTypeActiveCount =
		typeFilter === "all"
			? activeCount
			: items.filter((item) => item.pluginType === typeFilter && item.active).length;

	return (
		<AppPage>
			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
				className="flex flex-1"
			>
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
					<AppPageHeader
						eyebrow="Plugin Catalog"
						title={<span>Plugins</span>}
						description="Unified catalog for MLForm custom field, report, and explanation plugins. Use type filter, status, and search to manage plugin lifecycle in one place."
						aside={
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
						}
					/>

					<AppPanel className="grid gap-3">
						<input
							ref={inputRef}
							type="file"
							accept=".ts,text/typescript,application/typescript,text/plain"
							className="hidden"
							onChange={(event) => {
								void handleFileSelection(event);
							}}
						/>

						<div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
							<AppTextField
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search by file or kind"
								prefix={<Search size={16} className="text-[var(--text-muted)]" />}
							/>

							<AppSelect
								value={typeFilter}
								onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
								aria-label="Filter by plugin type"
							>
								<option value="all">All types</option>
								<option value="field">Fields</option>
								<option value="report">Reports</option>
								<option value="explanation">Explanations</option>
							</AppSelect>

							<div className="flex flex-wrap items-center gap-2">
								{([
									["all", "All"],
									["active", "Active"],
									["inactive", "Inactive"],
								] as const).map(([value, label]) => (
									<button
										key={value}
										type="button"
										onClick={() => setFilter(value)}
										className={cx(
											"rounded-full px-4 py-3 text-sm font-medium transition",
											filter === value
												? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
												: "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
										)}
									>
										{label}
									</button>
								))}
							</div>

							<div ref={sortMenuRef} className="relative">
								<button
									type="button"
									onClick={() => setIsSortOpen((current) => !current)}
									className="inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:border-[var(--text-primary)]"
									aria-haspopup="listbox"
									aria-expanded={isSortOpen}
								>
									<span className="inline-flex items-center gap-3">
										<ArrowUpDown size={15} className="text-[var(--text-muted)]" />
										{SORT_LABELS[sort]}
									</span>
									<ChevronDown
										size={16}
										className={cx(
											"text-[var(--text-secondary)] transition",
											isSortOpen && "rotate-180",
										)}
									/>
								</button>

								{isSortOpen ? (
									<div
										role="listbox"
										className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-[220px] overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]"
									>
										{(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(
											([value, label]) => (
												<button
													key={value}
													type="button"
													role="option"
													aria-selected={sort === value}
													onClick={() => {
														setSort(value);
														setIsSortOpen(false);
													}}
													className={cx(
														"flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition",
														sort === value
															? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
															: "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
													)}
												>
													<span>{label}</span>
													{sort === value ? <Check size={15} /> : null}
												</button>
											),
										)}
									</div>
								) : null}
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-[var(--text-secondary)]">
							<p className="font-medium text-[var(--text-primary)]">
								{filter === "active"
									? `Showing ${selectedTypeActiveCount} active plugin${selectedTypeActiveCount !== 1 ? "s" : ""}${
										typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`
									}.`
									: filter === "inactive"
										? `Showing ${selectedTypeCount - selectedTypeActiveCount} inactive plugin${selectedTypeCount - selectedTypeActiveCount !== 1 ? "s" : ""}${
											typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`
										}.`
										: `Showing ${selectedTypeCount} plugin${selectedTypeCount !== 1 ? "s" : ""}${
											typeFilter === "all" ? "" : ` (${TYPE_META[typeFilter].plural})`
										}.`}
							</p>
							<p>
								{activeCount === 0
									? "No active plugins. Runtime skips inactive custom kinds."
									: "Active plugins register native kinds before form mount."}
							</p>
						</div>
					</AppPanel>

					<section className="min-h-0 flex-1 overflow-auto">
						<div className="space-y-3">
							{filteredItems.length === 0 ? (
								<AppPanel className="border-dashed px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
									No plugins match current search/filter.
								</AppPanel>
							) : (
								filteredItems.map((item, index) => {
									const meta = TYPE_META[item.pluginType];
									const definitionKind = definitionKinds[item.uniqueKey] ?? null;
									const isBuiltin = item.id === BUILTIN_DEFAULT_ID;
									const displayName = definitionKind ?? item.fileName;

									return (
										<motion.div
											key={item.uniqueKey}
											initial={{ opacity: 0, y: 12 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.03, duration: 0.28 }}
											className="grid gap-4 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] px-5 py-5 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(260px,1.2fr)_minmax(160px,0.65fr)_auto]"
										>
											<div className="min-w-0 space-y-3">
												<div className="flex flex-wrap items-center gap-2">
													<span
														className={cx(
															"inline-flex size-2.5 rounded-full",
															item.active
																? "bg-[var(--accent-primary)]"
																: "bg-[var(--text-muted)]",
														)}
													/>
													<p className="truncate text-base font-semibold text-[var(--text-primary)]">
														{displayName}
													</p>
													<AppBadge tone={meta.tone} className="px-2.5 py-1 text-[0.7rem]">
														{meta.label}
													</AppBadge>
													<AppBadge className="px-2.5 py-1 text-[0.7rem]">
														{isBuiltin ? "system" : "user"}
													</AppBadge>
												</div>

												<p className="text-sm leading-6 text-[var(--text-secondary)]">
													{isBuiltin
														? "Built-in catalog definition. Can be activated, deactivated, or removed like any other item."
														: `Updated ${formatTimestamp(item.updatedAt)} · ${formatSize(item.sizeBytes)}`}
												</p>
											</div>

											<div className="flex items-center justify-start gap-2 lg:justify-end">
												<AppButton
													type="button"
													onClick={() => {
														void handleToggle(item);
													}}
													disabled={isBusy}
													variant={item.active ? "secondary" : "primary"}
												>
													<Power size={14} />
													{item.active ? "Deactivate" : "Activate"}
												</AppButton>

												<AppIconButton
													type="button"
													onClick={() => {
														void handleDelete(item);
													}}
													disabled={isBusy}
													aria-label={`Delete ${displayName}`}
													className="hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)] hover:text-[var(--danger-text)]"
												>
													<Trash2 size={16} />
												</AppIconButton>
											</div>
										</motion.div>
									);
								})
							)}
						</div>
					</section>
				</AppSurface>
			</motion.div>

			{toast ? (
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 18 }}
					className={cx(
						"pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm rounded-[22px] px-5 py-4 text-sm shadow-[var(--shadow-hover)]",
						toast.tone === "error"
							? "bg-[var(--danger-text)] text-[var(--text-inverse)]"
							: "bg-[var(--text-primary)] text-[var(--text-inverse)]",
					)}
				>
					<div className="flex items-start gap-3">
						{toast.tone === "error" ? <XCircle size={18} className="mt-0.5 shrink-0" /> : null}
						<p className="leading-6">{toast.message}</p>
					</div>
				</motion.div>
			) : null}
		</AppPage>
	);
}
