/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ColumnActionButton } from "./ColumnActionButton";
import { AppBadge, AppEyebrow } from "../../app/components";

type ColumnHeaderProps = {
	title: string;
	onClick: () => void | Promise<void>;
};

export function ColumnHeader({ title, onClick }: ColumnHeaderProps) {
	return (
		<div className="border-b border-[var(--border-soft)] p-6">
			<div className="mb-4 flex items-center justify-between gap-3">
				<div>
					<AppEyebrow className="mb-2">Collection</AppEyebrow>
					<h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
						{title}
					</h2>
				</div>
				<AppBadge tone="neutral">List</AppBadge>
			</div>
			<ColumnActionButton onClick={onClick}></ColumnActionButton>
		</div>
	);
}
