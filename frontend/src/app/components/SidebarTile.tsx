/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { cx } from "./ui";

export function SidebarTile({
	icon: Icon,
	label,
	isActive = false,
	variant = "navigation",
	onClick,
	className = "",
}: {
	icon: LucideIcon | ComponentType<{ size?: number; className?: string }>;
	label: string;
	isActive?: boolean;
	variant?: "navigation" | "action" | "auth";
	onClick?: () => void;
	className?: string;
}) {
	const getVariantStyles = () => {
		switch (variant) {
			case "navigation":
				return isActive
					? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
					: "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
			case "action":
				return "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
			case "auth":
				return "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
			default:
				return "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
		}
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={cx(
				"flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition active:scale-[0.985]",
				getVariantStyles(),
				className,
			)}
		>
			<Icon size={18} />
			<span className="text-sm">{label}</span>
		</button>
	);
}
