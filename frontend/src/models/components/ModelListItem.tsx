/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, Database, TrendingUp } from "lucide-react";
import { AppBadge, cx } from "../../app/components";
import type { ModelDto } from "../api/modelService";
import { type ModelAction, ModelActionsMenu } from "./ModelActionsMenu";
import { getModelAlgorithmLabel } from "../utils";

const getModelIcon = (type: string) => {
	switch (type) {
		case "classifier":
			return Database;
		case "regressor":
			return TrendingUp;
		default:
			return Database;
	}
};

type ModelListItemProps = {
	item: ModelDto;
	signatureCount: number;
	onOpen: () => void;
	onAction: (action: ModelAction, item: ModelDto) => void;
};

export function ModelListItem({
	item,
	signatureCount,
	onOpen,
	onAction,
}: ModelListItemProps) {
	const Icon = getModelIcon(item.type);

	return (
		<button
			type="button"
			onClick={onOpen}
			className={cx(
				"grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 text-left shadow-[var(--shadow-card)] transition",
				"hover:border-[var(--text-primary)] hover:shadow-[var(--shadow-hover)]",
			)}
		>
			<div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent-primary)]">
				<Icon size={18} />
			</div>

			<div className="min-w-0 space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
						{item.name}
					</h3>
					<AppBadge tone="success">active</AppBadge>
					<AppBadge>{signatureCount} signatures</AppBadge>
				</div>

				<p className="text-sm font-medium text-[var(--text-secondary)]">
					{getModelAlgorithmLabel(item)}
				</p>

				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
					<span>Created {new Date(item.createdAt).toLocaleString()}</span>
					<span>Updated {new Date(item.createdAt).toLocaleString()}</span>
					<span>{item.fileName}</span>
				</div>
			</div>

			<div className="flex items-start gap-2">
				<ModelActionsMenu
					modelName={item.name}
					onAction={(action) => onAction(action, item)}
				/>
				<div className="flex size-10 items-center justify-center rounded-full text-[var(--text-muted)]">
					<ArrowRight size={16} />
				</div>
			</div>
		</button>
	);
}
