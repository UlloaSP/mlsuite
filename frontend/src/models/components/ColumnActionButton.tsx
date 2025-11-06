/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BadgePlus } from "lucide-react";
import { motion } from "motion/react";

type ColumnActionButtonProps = {
	onClick: () => void | Promise<void>;
};

export function ColumnActionButton({ onClick }: ColumnActionButtonProps) {
	return (
		<motion.button
			onClick={onClick}
			className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-800 hover:from-yellow-500 hover:to-amber-900 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			<BadgePlus size={28} fontWeight={30} />
		</motion.button>
	);
}
