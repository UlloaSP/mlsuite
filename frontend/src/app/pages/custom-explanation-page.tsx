/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowUpDown, Check, ChevronDown, Power, Search, Trash2, Upload, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useUser } from "../../user/hooks";
import {
	activateCustomExplanation,
	deactivateAllCustomExplanations,
	deactivateCustomExplanation,
	deleteCustomExplanation,
	getCustomExplanations,
	uploadCustomExplanation,
	type CustomExplanationDto,
} from "../api/customExplanationService";
import {
	AppBadge,
	AppButton,
	AppIconButton,
	AppPage,
	AppPageHeader,
	AppPanel,
	AppSurface,
	AppTextField,
	cx,
} from "../components";
import {
	invalidateActiveCustomExplanationDefinition,
	validateCustomExplanationSource,
} from "../utils/mlform/custom-explanation";
import { Unauthorized } from "./Unauthorized";

const BUILTIN_DEFAULT_ID = "builtin-default-plugin";

type FilterMode = "all" | "active" | "inactive";
type SortMode = "updated" | "name" | "size";
type ToastState = {
	tone: "success" | "error";
	message: string;
} | null;

const SORT_LABELS: Record<SortMode, string> = {
	updated: "Latest updated",
	name: "Name",
	size: "Size",
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

const isBuiltinPlugin = (item: CustomExplanationDto): boolean => item.id === BUILTIN_DEFAULT_ID;

export function CustomExplanationPage() {
	const { data: user, error } = useUser();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const sortMenuRef = useRef<HTMLDivElement | null>(null);
	const [items, setItems] = useState<CustomExplanationDto[]>([]);
	const [isBusy, setIsBusy] = useState(false);
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<FilterMode>("all");
	const [sort, setSort] = useState<SortMode>("updated");
	const [isSortOpen, setIsSortOpen] = useState(false);
	const [toast, setToast] = useState<ToastState>(null);

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

	const refreshItems = async (): Promise<CustomExplanationDto[]> => {
		const nextItems = await getCustomExplanations();
		setItems(nextItems);
		return nextItems;
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
			await validateCustomExplanationSource(source);
			await uploadCustomExplanation(file);
			await refreshItems();
			pushToast("success", `${file.name} uploaded to catalog.`);
		} catch (uploadError: unknown) {
			pushToast("error", uploadError instanceof Error ? uploadError.message : String(uploadError));
		} finally {
			setIsBusy(false);
			event.target.value = "";
		}
	};

	const handleToggle = async (item: CustomExplanationDto) => {
		setIsBusy(true);
		try {
			if (item.active) {
				await deactivateCustomExplanation(item.id);
			} else {
				await activateCustomExplanation(item.id);
			}
			invalidateActiveCustomExplanationDefinition();
			await refreshItems();
			pushToast("success", `${item.fileName} ${item.active ? "deactivated" : "activated"}.`);
		} catch (toggleError: unknown) {
			pushToast("error", toggleError instanceof Error ? toggleError.message : String(toggleError));
		} finally {
			setIsBusy(false);
		}
	};

	const handleDelete = async (item: CustomExplanationDto) => {
		setIsBusy(true);
		try {
			await deleteCustomExplanation(item.id);
			invalidateActiveCustomExplanationDefinition();
			await refreshItems();
			pushToast("success", `${item.fileName} deleted from catalog.`);
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
			await deactivateAllCustomExplanations();
			invalidateActiveCustomExplanationDefinition();
			await refreshItems();
			pushToast("success", "All plugins deactivated. Explanation panels stay hidden.");
		} catch (deactivateError: unknown) {
			pushToast("error", deactivateError instanceof Error ? deactivateError.message : String(deactivateError));
		} finally {
			setIsBusy(false);
		}
	};

	const normalizedQuery = query.trim().toLowerCase();
	const filteredItems = items
		.filter((item) => {
			if (filter === "active" && !item.active) {
				return false;
			}

			if (filter === "inactive" && item.active) {
				return false;
			}

			if (normalizedQuery.length === 0) {
				return true;
			}

			return item.fileName.toLowerCase().includes(normalizedQuery);
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

	const activeCount = items.filter((item) => item.active).length;
	const catalogCount = items.length;

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
						title={
							<span className="flex flex-wrap items-center gap-3">
								<span>Explanation Plugins</span>
							</span>
						}
						description="Each plugin decides where explanation data comes from and how it is represented. You can activate several at once, deactivate all, delete any catalog item, or leave everything off so explanations never render even if the schema requests them."
						aside={
							<>
								<AppButton
									type="button"
									onClick={handleDeactivateAll}
									disabled={isBusy || activeCount === 0}
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

						<div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
							<AppTextField
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search plugins"
								prefix={<Search size={16} className="text-[var(--text-muted)]" />}
							/>

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
										{(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(([value, label]) => (
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
										))}
									</div>
								) : null}
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-[var(--text-secondary)]">
							<p className="font-medium text-[var(--text-primary)]">
								{filter === "active"
									? `Showing ${activeCount} active plugin${activeCount !== 1 ? "s" : ""}.`
									: filter === "inactive"
										? `Showing ${catalogCount - activeCount} inactive plugin${catalogCount - activeCount !== 1 ? "s" : ""}.`
										: `Showing all ${catalogCount} plugin${catalogCount !== 1 ? "s" : ""}.`}
							</p>
							<p>
								{activeCount === 0
									? "No active plugins. Explanations hidden."
									: "Active plugins render in parallel."}
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
								filteredItems.map((item, index) => (
									<motion.div
										key={item.id}
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
														item.active ? "bg-[var(--accent-primary)]" : "bg-[var(--text-muted)]",
													)}
												/>
												<p className="truncate text-base font-semibold text-[var(--text-primary)]">
													{item.fileName}
												</p>
												<AppBadge className="px-2.5 py-1 text-[0.7rem]">
													{isBuiltinPlugin(item) ? "system" : "user"}
												</AppBadge>
											</div>

											<p className="text-sm leading-6 text-[var(--text-secondary)]">
												{isBuiltinPlugin(item)
													? "Built-in catalog plugin. Can be activated, deactivated, or removed like any other item."
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
												className={item.active ? undefined : "hover:bg-[var(--accent-primary-strong)]"}
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
												aria-label={`Delete ${item.fileName}`}
												className="hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)] hover:text-[var(--danger-text)]"
											>
												<Trash2 size={16} />
											</AppIconButton>
										</div>
									</motion.div>
								))
							)}
						</div>
					</section>
				</AppSurface>
			</motion.div>

			{
				toast ? (
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
				) : null
			}
		</AppPage >
	);
}
