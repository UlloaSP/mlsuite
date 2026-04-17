/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { cx } from "../../app/components";
import { ColumnBody } from "./ColumnBody";
import { ColumnHeader } from "./ColumnHeader";

interface ColumnProps {
	title: string;
	onClick: () => void | Promise<void>;
	items: any[];
	selectedItemId: string | null;
	onItemSelect: (itemId: string) => void;
	cardComponent: React.ComponentType<{
		item: any;
		index: number;
		selectedItemId: string | null;
		onItemSelect: (itemId: string) => void;
	}>;
}

export function Column({
	title,
	onClick,
	items,
	selectedItemId,
	onItemSelect,
	cardComponent,
}: ColumnProps) {
	return (
		<motion.div
			initial={{ x: -300, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
			className={cx(
				"flex flex-1 flex-col overflow-hidden rounded-[28px] border",
				"border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]",
			)}
		>
			<ColumnHeader title={title} onClick={onClick} />
			<ColumnBody
				items={items}
				selectedItemId={selectedItemId}
				onItemSelect={onItemSelect}
				cardComponent={cardComponent}
			/>
		</motion.div>
	);
}
