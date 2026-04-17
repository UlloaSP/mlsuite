/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Database, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { AppBadge, cx } from "../../app/components";
import type { ModelDto } from "../api/modelService";

const getModelIcon = (type: string) => {
	switch (type) {
		case "classifier":
			return Database;
		case "regressor":
			return TrendingUp;
	}
};

const getStatusColor = (status: string) => {
	switch (status) {
		case "active":
			return "success";
		case "training":
			return "warning";
		case "inactive":
			return "neutral";
		default:
			return "neutral";
	}
};

interface ModelCardProps {
	item: ModelDto;
	index: number;
	selectedItemId: string | null;
	onItemSelect: (modelId: string) => void;
}

export function ModelCard({
	item,
	index,
	selectedItemId,
	onItemSelect,
}: ModelCardProps) {
	const Icon = getModelIcon(item.type);
	const isSelected = selectedItemId === item.id;
	return (
		<motion.button
			key={item.id}
			onClick={() => onItemSelect(item.id)}
			className={cx(
				"grid grid-cols-[auto_1fr_auto] items-start gap-4 rounded-[22px] border p-4 text-left transition",
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
				{Icon && (
					<Icon
						size={16}
						className={isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"}
					/>
				)}
			</div>
			<div>
				<h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
					{item.name}
				</h3>

				<div className="mt-2 flex flex-col gap-y-2 text-xs text-[var(--text-secondary)]">
					<span className="capitalize">{item.type}</span>

					<div className="flex flex-col truncate font-mono text-xs text-[var(--text-muted)]">
						<span>Estimator: {item.specificType}</span>
						<span>
							Created At: {new Date(item.createdAt).toLocaleDateString()}
						</span>
						<span>{item.fileName}</span>
					</div>
				</div>
			</div>
			<div className="flex flex-col justify-between items-center">
				<AppBadge tone={getStatusColor("active") as "success" | "warning" | "neutral"}>
					active
				</AppBadge>
			</div>
		</motion.button>
	);
}
