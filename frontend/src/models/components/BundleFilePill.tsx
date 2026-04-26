/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "../../app/components";
import { formatBytes } from "../bundle-utils";

type Props = {
	name: string;
	size: number;
	kind: "model" | "df";
	badge: string;
};

const ModelIcon = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<circle cx="12" cy="12" r="3" />
		<path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
	</svg>
);

const DfIcon = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect x="3" y="3" width="18" height="18" rx="2" />
		<path d="M3 9h18M3 15h18M9 3v18" />
	</svg>
);

export function BundleFilePill({ name, size, kind, badge }: Props) {
	const isModel = kind === "model";

	return (
		<div className="flex items-center gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-2">
			<div
				className={cx(
					"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]",
					isModel
						? "bg-[var(--accent-quiet)] text-[var(--accent-primary)]"
						: "bg-blue-500/10 text-blue-500",
				)}
			>
				{isModel ? <ModelIcon /> : <DfIcon />}
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-bold text-[var(--text-primary)]">{name}</p>
				<p className="mt-px font-mono text-[10px] text-[var(--text-muted)]">
					{formatBytes(size)}
				</p>
			</div>

			<span
				className={cx(
					"flex-shrink-0 rounded-full px-[7px] py-0.5 font-mono text-[10px] font-medium tracking-[0.03em]",
					isModel
						? "bg-[var(--accent-quiet)] text-[var(--accent-primary)]"
						: "bg-blue-500/[0.08] text-blue-500",
				)}
			>
				{badge}
			</span>
		</div>
	);
}
