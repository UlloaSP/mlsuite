/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { AppPanel } from "../../app/components";
import type { PredictionDto, TargetDto } from "../api/modelService";
import { GET_TARGETS_QUERY_KEY } from "../hooks";
import * as modelApi from "../api/modelService";
import {
	formatExecutionTime,
	getPredictionExecutionTime,
	getPredictionShortId,
} from "../utils";
import { PredictionStatusPill } from "./PredictionStatusPill";

type PredictionHistoryTableProps = {
	predictions: PredictionDto[];
	onOpenPrediction: (predictionId: string) => void;
};

export function PredictionHistoryTable({
	predictions,
	onOpenPrediction,
}: PredictionHistoryTableProps) {
	const targetQueries = useQueries({
		queries: predictions.map((prediction) => ({
			queryKey: GET_TARGETS_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: async () => modelApi.getTargets({ predictionId: prediction.id || "" }),
			enabled: Boolean(prediction.id),
			placeholderData: [] as TargetDto[],
			staleTime: 5 * 60_000,
		})),
	});

	return (
		<AppPanel className="overflow-hidden p-0">
			<div className="overflow-x-auto">
				<table className="min-w-full border-collapse">
					<thead className="bg-[var(--surface-secondary)]">
						<tr className="text-left text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
							<th className="px-5 py-4">Prediction</th>
							<th className="px-5 py-4">Date & time</th>
							<th className="px-5 py-4">Latency</th>
							<th className="px-5 py-4">Features</th>
							<th className="px-5 py-4">Targets</th>
							<th className="px-5 py-4">Status</th>
							<th className="px-5 py-4 text-right">Action</th>
						</tr>
					</thead>
					<tbody>
						{predictions.map((prediction, index) => {
							const targets = (targetQueries[index]?.data as TargetDto[] | undefined) ?? [];
							return (
								<tr
									key={prediction.id}
									className="cursor-pointer border-t border-[var(--border-soft)] text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
									onClick={() => onOpenPrediction(prediction.id)}
								>
									<td className="px-5 py-4">
										<div className="space-y-1">
											<p className="font-medium">{prediction.name}</p>
											<p className="font-mono text-xs text-[var(--text-muted)]">
												{getPredictionShortId(prediction.id)}
											</p>
										</div>
									</td>
									<td className="px-5 py-4 text-[var(--text-secondary)]">
										{new Date(prediction.createdAt).toLocaleString()}
									</td>
									<td className="px-5 py-4">
										{formatExecutionTime(getPredictionExecutionTime(prediction.prediction))}
									</td>
									<td className="px-5 py-4">
										{Object.keys(prediction.inputs ?? {}).length}
									</td>
									<td className="px-5 py-4">
										{targetQueries[index]?.isLoading ? "..." : targets.length}
									</td>
									<td className="px-5 py-4">
										<PredictionStatusPill status={prediction.status} />
									</td>
									<td className="px-5 py-4 text-right">
										<span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
											View
											<ArrowRight size={14} />
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</AppPanel>
	);
}
