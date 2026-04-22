/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	AlertCircle,
	CheckCircle,
	Clock,
	Goal,
	LibraryBig,
	Target,
	XCircle,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppBadge, cx } from "../../app/components";
import type { PredictionDto } from "../api/modelService";
import { useGetTargets } from "../hooks";
import { getPredictionTimestamp } from "../utils";

const getStatusIcon = (status: string) => {
	switch (status.toString()) {
		case "COMPLETED":
			return CheckCircle;
		case "FAILED":
			return XCircle;
		case "PENDING":
			return AlertCircle;
		default:
			return AlertCircle;
	}
};

const getStatusColor = (status: string) => {
	switch (status.toString()) {
		case "COMPLETED":
			return "success";
		case "FAILED":
			return "danger";
		case "PENDING":
			return "warning";
		default:
			return "neutral";
	}
};

type PredictionCardProps = {
	item: PredictionDto;
	index: number;
	selectedItemId: string | null;
	onItemSelect: (predictionId: string) => void;
};

export function PredictionCard({
	item,
	index,
	selectedItemId,
	onItemSelect,
}: PredictionCardProps) {
	const [, setValue] = useState<string>("");
	const isSelected = selectedItemId === item.id;
	const itemStatus =
		typeof item.status === "string" ? item.status : String(item.status ?? "PENDING");
	const StatusIcon = getStatusIcon(itemStatus);

	const { data: targets = [] } = useGetTargets({ predictionId: item.id || "" });

	useEffect(() => {
		let outputs: any[] = [];
		// @ts-ignore
		if (item.prediction && Array.isArray(item.prediction.outputs)) {
			// @ts-ignore
			outputs = item.prediction.outputs;
		}

		if (outputs.length > 0 && outputs[0]?.type === "classifier") {
			const probabilities = outputs[0].probabilities ?? [];
			if (Array.isArray(probabilities) && probabilities.length > 0) {
				const maxProb = probabilities[0].reduce(
					(max: number, current: number) => (current > max ? current : max),
					0,
				);
				setValue(maxProb);
			}
		} else if (outputs.length > 0 && outputs[0]?.type === "regressor") {
			const values = outputs[0].values ?? [];
			if (Array.isArray(values) && values.length > 0) {
				setValue(values.toString());
			}
		}
	}, [item]);

	const formatExecutionTime = (time: number) => {
		if (time < 1000) {
			return `${time.toFixed(2).toLocaleString()} ms`;
		}
		if (time < 60000) {
			return `${(time / 1000).toFixed(2).toLocaleString()} s`;
		}
		if (time < 3600000) {
			return `${(time / 60000).toFixed(2).toLocaleString()} min`;
		}

		return `${(time / 3600000).toFixed(2).toLocaleString()} h`;
	};

	return (
		<motion.button
			key={item.id}
			onClick={() => onItemSelect(item.id)}
			className={cx(
				"grid min-h-fit grid-cols-[auto_1fr_auto] items-start gap-4 rounded-[22px] border p-4 text-left transition",
				"border-[var(--border-soft)] bg-[var(--surface-secondary)]",
				isSelected
					? "bg-[var(--accent-quiet)] shadow-[var(--shadow-hover)]"
					: "hover:bg-[var(--surface-primary)] hover:shadow-[var(--shadow-hover)]",
			)}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 0.3 }}
			whileHover={{ scale: 1.01, y: -2 }}
			whileTap={{ scale: 0.98 }}
		>
			<div
				className={cx(
					"flex max-w-fit items-center rounded-2xl p-3",
					isSelected ? "bg-[var(--surface-primary)]" : "bg-[var(--surface-muted)]",
				)}
			>
				<Target
					size={16}
					className={isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"}
				/>
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium text-[var(--text-primary)]">
					<span>{item.name}</span>
				</div>

				<div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
					<Clock size={12} />
					<span>{new Date(getPredictionTimestamp(item)).toLocaleString()}</span>
				</div>

				<div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
					<Zap size={12} />
					<span>
						{/* @ts-ignore */}
						{formatExecutionTime(item.prediction.outputs[0].execution_time)}
					</span>
				</div>

				<div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
					<LibraryBig size={12} />
					<span>{`${(Object.keys(item.inputs).length).toLocaleString()} ${Object.keys(item.inputs).length > 1 ? "features" : "feature"}`}</span>
				</div>

				<div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
					<Goal size={12} />
					<span>{`${targets.length.toLocaleString()} ${targets.length > 1 ? "targets" : "target"}`}</span>
				</div>
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center space-x-2">
						<StatusIcon
							size={14}
							className="text-[var(--text-secondary)]"
						/>
						<AppBadge
							tone={getStatusColor(itemStatus) as "success" | "danger" | "warning" | "neutral"}
						>
							{itemStatus === "COMPLETED" ? "success" : itemStatus.toLocaleLowerCase()}
						</AppBadge>
					</div>
				</div>
			</div>
		</motion.button>
	);
}
