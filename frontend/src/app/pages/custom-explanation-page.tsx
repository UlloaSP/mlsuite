/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Power, Trash2, Upload, XCircle } from "lucide-react";
import { Unauthorized } from "./Unauthorized";
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
	invalidateActiveCustomExplanationDefinition,
	validateCustomExplanationSource,
} from "../utils/mlform/custom-explanation";

const BUILTIN_DEFAULT_ID = "builtin-default-plugin";

const readFileText = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
		reader.onerror = () => reject(reader.error ?? new Error("Could not read selected file."));
		reader.readAsText(file);
	});

type ValidationState =
	| { status: "idle"; message: string }
	| { status: "loading"; message: string }
	| { status: "success"; message: string }
	| { status: "error"; message: string };

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
	const [items, setItems] = useState<CustomExplanationDto[]>([]);
	const [validation, setValidation] = useState<ValidationState>({
		status: "idle",
		message: "Plugin catalog ready. Activate any combination or leave all disabled.",
	});
	const [isBusy, setIsBusy] = useState(false);

	const refreshItems = async (message?: string) => {
		setIsBusy(true);
		try {
			const nextItems = await getCustomExplanations();
			setItems(nextItems);
			const activeCount = nextItems.filter((item) => item.active).length;
			setValidation({
				status: "success",
				message:
					message ??
					(activeCount > 0
						? `Catalog loaded. ${activeCount} plugin${activeCount === 1 ? "" : "s"} active.`
						: "Catalog loaded. No active plugins, so explanations stay hidden."),
			});
		} catch (loadError: unknown) {
			setValidation({
				status: "error",
				message: loadError instanceof Error ? loadError.message : String(loadError),
			});
		} finally {
			setIsBusy(false);
		}
	};

	useEffect(() => {
		void refreshItems();
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
		setValidation({
			status: "loading",
			message: `Validating ${file.name} before upload...`,
		});

		try {
			const source = await readFileText(file);
			await validateCustomExplanationSource(source);
			await uploadCustomExplanation(file);
			await refreshItems(`${file.name} uploaded to catalog.`);
		} catch (uploadError: unknown) {
			setValidation({
				status: "error",
				message: uploadError instanceof Error ? uploadError.message : String(uploadError),
			});
		} finally {
			setIsBusy(false);
			event.target.value = "";
		}
	};

	const handleToggle = async (item: CustomExplanationDto) => {
		setIsBusy(true);
		setValidation({
			status: "loading",
			message: item.active ? `Deactivating ${item.fileName}...` : `Activating ${item.fileName}...`,
		});

		try {
			if (item.active) {
				await deactivateCustomExplanation(item.id);
			} else {
				await activateCustomExplanation(item.id);
			}
			invalidateActiveCustomExplanationDefinition();
			await refreshItems(
				item.active
					? `${item.fileName} deactivated.`
					: `${item.fileName} activated.`,
			);
		} catch (toggleError: unknown) {
			setValidation({
				status: "error",
				message: toggleError instanceof Error ? toggleError.message : String(toggleError),
			});
		} finally {
			setIsBusy(false);
		}
	};

	const handleDelete = async (item: CustomExplanationDto) => {
		setIsBusy(true);
		setValidation({
			status: "loading",
			message: `Deleting ${item.fileName}...`,
		});

		try {
			await deleteCustomExplanation(item.id);
			invalidateActiveCustomExplanationDefinition();
			await refreshItems(`${item.fileName} deleted from catalog.`);
		} catch (deleteError: unknown) {
			setValidation({
				status: "error",
				message: deleteError instanceof Error ? deleteError.message : String(deleteError),
			});
		} finally {
			setIsBusy(false);
		}
	};

	const catalogCount = items.length;

	return (
		<div className="flex size-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.2),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_24%),linear-gradient(135deg,_#f8fbff_0%,_#eef6ff_46%,_#fff8f1_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.1),_transparent_18%),linear-gradient(135deg,_#07111d_0%,_#0f172a_52%,_#111827_100%)]">
			<div className="flex flex-1 overflow-hidden p-8">
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
					className="flex flex-1 flex-col gap-6 overflow-hidden rounded-[28px] border border-white/40 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55"
				>
					<section className="flex flex-wrap items-start justify-between gap-6 rounded-[24px] border border-slate-200/70 bg-white/85 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-800 dark:bg-slate-900/75">
						<div className="space-y-3">
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.36em] text-cyan-700 dark:text-cyan-300">
								Plugin Catalog
							</p>
							<h1 className="font-serif text-4xl leading-none text-slate-900 dark:text-white">
								Explanation Plugins
							</h1>
							<p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
								Each plugin decides how to fetch explanation data and how to render it.
								You can activate several at once, deactivate all, or delete any catalog item.
								If none are active, explanation panels stay hidden even if the schema asks for
								them.
							</p>
						</div>

						<div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-5 py-4 dark:border-cyan-900/60 dark:bg-cyan-950/30">
							<p className="text-[0.65rem] uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
								Catalog Plugins
							</p>
							<p className="mt-2 text-3xl font-semibold text-cyan-900 dark:text-cyan-100">
								{catalogCount}
							</p>
						</div>
					</section>

					<section className="flex min-h-0 flex-1 flex-col gap-5 rounded-[24px] border border-slate-200/70 bg-white/85 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-800 dark:bg-slate-900/75">
						<input
							ref={inputRef}
							type="file"
							accept=".ts,text/typescript,application/typescript,text/plain"
							className="hidden"
							onChange={(event) => {
								void handleFileSelection(event);
							}}
						/>

						<div className="flex flex-wrap items-center justify-between gap-4">
							<div
								className={`flex-1 rounded-[22px] border px-4 py-4 text-sm shadow-sm ${
									validation.status === "error"
										? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
										: validation.status === "success"
											? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
											: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
								}`}
							>
								<div className="flex items-start gap-3">
									{validation.status === "error" ? (
										<XCircle size={18} className="mt-0.5 shrink-0" />
									) : (
										<CheckCircle2 size={18} className="mt-0.5 shrink-0" />
									)}
									<p className="whitespace-pre-wrap leading-6">{validation.message}</p>
								</div>
							</div>

							<button
								type="button"
								onClick={() => inputRef.current?.click()}
								disabled={isBusy}
								className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
							>
								<Upload size={16} className="transition group-hover:-translate-y-0.5" />
								Upload `.ts`
							</button>
						</div>

						<div className="min-h-0 flex-1 overflow-auto rounded-[22px] border border-slate-200/80 bg-slate-50/85 p-3 dark:border-slate-800 dark:bg-slate-950/45">
							<div className="space-y-3">
								{items.length === 0 ? (
									<div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
										No plugins in catalog.
									</div>
								) : (
									items.map((item) => (
										<div
											key={item.id}
											className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70"
										>
											<div className="flex flex-wrap items-start justify-between gap-4">
												<div className="space-y-2">
													<div className="flex flex-wrap items-center gap-2">
														<p className="font-medium text-slate-900 dark:text-white">
															{item.fileName}
														</p>
														<span
															className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
																item.active
																	? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300"
																	: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
															}`}
														>
															{item.active ? "active" : "inactive"}
														</span>
														<span className="rounded-full border border-slate-200 px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:text-slate-300">
															{isBuiltinPlugin(item) ? "built-in" : "uploaded"}
														</span>
													</div>
													<p className="text-xs text-slate-500 dark:text-slate-400">
														{isBuiltinPlugin(item)
															? "Built into catalog."
															: `${formatSize(item.sizeBytes)} · Updated ${formatTimestamp(item.updatedAt)}`}
													</p>
												</div>

												<div className="flex flex-wrap items-center gap-2">
													<button
														type="button"
														onClick={() => {
															void handleToggle(item);
														}}
														disabled={isBusy}
														className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
															item.active
																? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
																: "bg-slate-950 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
														}`}
													>
														<Power size={12} />
														{item.active ? "deactivate" : "activate"}
													</button>

													<button
														type="button"
														onClick={() => {
															void handleDelete(item);
														}}
														disabled={isBusy}
														className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
													>
														<Trash2 size={12} />
														delete
													</button>
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</section>
				</motion.div>
			</div>
		</div>
	);
}
