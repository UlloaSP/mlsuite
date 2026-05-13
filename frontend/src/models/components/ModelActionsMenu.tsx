/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIconButton, cx } from "../../app/components";

export type ModelAction = "edit" | "delete" | "duplicate";

const ACTIONS: Array<{
	value: ModelAction;
	label: string;
	icon: typeof Pencil;
}> = [
	{ value: "edit", label: "Edit", icon: Pencil },
	{ value: "duplicate", label: "Duplicate", icon: Copy },
	{ value: "delete", label: "Delete", icon: Trash2 },
];

type ModelActionsMenuProps = {
	canDelete: boolean;
	canEdit: boolean;
	modelName: string;
	onAction: (action: ModelAction) => void;
};

export function ModelActionsMenu({
	canDelete,
	canEdit,
	modelName,
	onAction,
}: ModelActionsMenuProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		return () => window.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	return (
		<div ref={rootRef} className="relative">
			<AppIconButton
				type="button"
				aria-label={`Open actions for ${modelName}`}
				onClick={(event) => {
					event.stopPropagation();
					setOpen((current) => !current);
				}}
			>
				<Ellipsis size={18} />
			</AppIconButton>

			{open ? (
				<div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[180px] rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
					{ACTIONS.reduce<React.JSX.Element[]>((items, action) => {
						if (!(action.value === "delete" ? canDelete : canEdit)) {
							return items;
						}
						const Icon = action.icon;
						items.push(
							<button
								key={action.value}
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									onAction(action.value);
									setOpen(false);
								}}
								className={cx(
									"flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-sm font-medium transition",
									action.value === "delete"
										? "text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]"
										: "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
								)}
							>
								<Icon size={15} />
								{action.label}
							</button>,
						);
						return items;
					}, [])}
				</div>
			) : null}
		</div>
	);
}
