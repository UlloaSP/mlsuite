/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowUpDown, Search } from "lucide-react";
import { AppTextField, AppToolbar } from "../../app/components";
import type { PredictionDto } from "../api/modelService";
import { ExportButton } from "./ExportButton";

export type PredictionHistorySort = "updated" | "status" | "latency";

const SORT_LABELS: Record<PredictionHistorySort, string> = {
	updated: "Latest updated",
	status: "Status",
	latency: "Latency",
};

type PredictionHistoryToolbarProps = {
	query: string;
	sort: PredictionHistorySort;
	onQueryChange: (value: string) => void;
	onSortChange: (value: PredictionHistorySort) => void;
	predictions: PredictionDto[];
};

export function PredictionHistoryToolbar({
	query,
	sort,
	onQueryChange,
	onSortChange,
	predictions,
}: PredictionHistoryToolbarProps) {
	return (
		<AppToolbar>
			<div className="flex flex-1 flex-wrap items-center gap-3">
				<AppTextField
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Search prediction history..."
					prefix={<Search size={16} className="text-[var(--text-muted)]" />}
					className="min-w-[280px] flex-1"
				/>

				<label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
					<ArrowUpDown size={15} className="text-[var(--text-muted)]" />
					<select
						value={sort}
						onChange={(event) => onSortChange(event.target.value as PredictionHistorySort)}
						className="bg-transparent text-[var(--text-primary)] outline-none"
					>
						{(Object.entries(SORT_LABELS) as Array<[PredictionHistorySort, string]>).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</label>
			</div>

			<ExportButton predictions={predictions} />
		</AppToolbar>
	);
}
