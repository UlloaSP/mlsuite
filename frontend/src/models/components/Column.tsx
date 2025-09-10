import { motion } from "motion/react";
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
			className=" flex flex-col flex-1 overflow-hidden rounded bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
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
