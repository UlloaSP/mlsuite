/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import { m as motion } from "motion/react";
import type { ComponentType } from "react";
import { cx, FOCUS_RING } from "./ui";

export function SidebarTile({
	icon: Icon,
	label,
	isActive = false,
	variant = "navigation",
	collapsed = false,
	ariaExpanded,
	onClick,
	className = "",
}: {
	icon: LucideIcon | ComponentType<{ size?: number; className?: string }>;
	label: string;
	isActive?: boolean;
	variant?: "navigation" | "action" | "auth";
	collapsed?: boolean;
	ariaExpanded?: boolean;
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
			default:
				return "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
		}
	};

	const button = (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			aria-expanded={ariaExpanded}
			className={cx(
				"flex flex-1 min-w-0 box-border items-center rounded-xl text-left text-sm font-medium transition active:scale-[0.985]",
				FOCUS_RING,
				collapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
				getVariantStyles(),
				className,
			)}
		>
			<Icon size={18} className="shrink-0" />
			{!collapsed && (
				<motion.span
					key="label"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="whitespace-nowrap text-sm"
				>
					{label}
				</motion.span>
			)}
		</button>
	);

	return button;
}
