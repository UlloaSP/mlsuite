/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Calendar, FileCode } from "lucide-react";
import { motion } from "motion/react";
import { AppBadge, cx } from "../../app/components";
import type { SignatureDto } from "../api/modelService";

const getStatusColor = (status: string) => {
	switch (status) {
		case "active":
			return "success";
		case "deprecated":
			return "danger";
		case "legacy":
			return "warning";
		default:
			return "neutral";
	}
};

type SignatureCardProps = {
	item: SignatureDto;
	index: number;
	selectedItemId: string | null;
	onItemSelect: (itemId: string) => void;
};

export function SignatureCard({
	item,
	index,
	selectedItemId,
	onItemSelect,
}: SignatureCardProps) {
	const isSelected = selectedItemId === item.id;
	return (
		<motion.button
			key={item.id}
			onClick={() => onItemSelect(item.id)}
			className={cx(
				"grid min-h-fit grid-cols-[auto_1fr] items-start gap-4 rounded-[22px] border p-4 text-left transition",
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
				<FileCode
					size={16}
					className={isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-2">
					<h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
						{item.name}
					</h3>
					<AppBadge tone={getStatusColor("active") as "success" | "danger" | "warning" | "neutral"}>
						active
					</AppBadge>
				</div>

				<div className="space-y-1">
					<span className="text-xs font-mono text-[var(--text-secondary)]">
						Version: v{item.major + "." + item.minor + "." + item.patch}
					</span>

					<div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
						<Calendar size={12} />
						<span>{new Date(item.createdAt).toLocaleDateString()}</span>
					</div>

					{item.origin && (
						<div className="text-xs text-[var(--accent-primary)]">
							Based on previous version
						</div>
					)}
				</div>
			</div>
		</motion.button>
	);
}
