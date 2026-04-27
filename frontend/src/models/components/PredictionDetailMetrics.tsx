/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge, AppPanel } from "../../app/components";
import { formatExecutionTime } from "../utils";
import { PredictionMetricCell } from "./PredictionMetricCell";

type PredictionDetailMetricsProps = {
	targetCount: number;
	executionTime?: number | null;
	timestamp: string;
	status: "COMPLETED" | "PENDING";
};

export function PredictionDetailMetrics({
	targetCount,
	executionTime,
	timestamp,
	status,
}: PredictionDetailMetricsProps) {
	return (
		<div className="grid gap-4 xl:grid-cols-4">
			<AppPanel>
				<PredictionMetricCell label="Targets predicted" value={`${targetCount}`} />
			</AppPanel>
			<AppPanel>
				<PredictionMetricCell label="Execution time" value={formatExecutionTime(executionTime ?? null)} />
			</AppPanel>
			<AppPanel>
				<PredictionMetricCell label="Timestamp" value={timestamp} />
			</AppPanel>
			<AppPanel className="space-y-3">
				<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Feedback Status</p>
				<AppBadge tone={status === "COMPLETED" ? "success" : "warning"}>
					{status === "COMPLETED" ? "Feedback completed" : "Feedback pending"}
				</AppBadge>
			</AppPanel>
		</div>
	);
}
