/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Calendar, FileCode } from "lucide-react";
import { motion } from "motion/react";
import type { SignatureDto } from "../api/modelService";

const getStatusColor = (status: string) => {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
		case "deprecated":
			return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
		case "legacy":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
		default:
			return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
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
			className={`grid grid-cols-[2fr_13fr] min-h-fit items-start text-left p-4 rounded-xl border transition-all duration-300 ${isSelected
					? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 shadow-md"
					: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
				}`}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 0.3 }}
			whileHover={{ scale: 1.02, y: -2 }}
			whileTap={{ scale: 0.98 }}
		>
			{/* Icon Section */}
			<div
				className={`flex items-left p-2 max-w-fit rounded-lg ${isSelected ? "bg-green-100 dark:bg-green-800" : "bg-gray-200 dark:bg-gray-700"}`}
			>
				<FileCode
					size={16}
					className={
						isSelected
							? "text-green-600 dark:text-green-400"
							: "text-gray-600 dark:text-gray-400"
					}
				/>
			</div>
			{/* Details Section */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
						{item.name}
					</h3>
					<span
						className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor("active")}`}
					>
						{"active"}
					</span>
				</div>

				<div className="space-y-1">
					<span className="text-xs font-mono text-gray-600 dark:text-gray-400">
						Version: v{item.major + "." + item.minor + "." + item.patch}
					</span>

					<div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
						<Calendar size={12} />
						<span>{new Date(item.createdAt).toLocaleDateString()}</span>
					</div>

					{item.origin && (
						<div className="text-xs text-blue-600 dark:text-blue-400">
							Based on previous version
						</div>
					)}
				</div>
			</div>
		</motion.button>
	);
}
