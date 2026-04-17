/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { AppPanel, AppSectionTitle } from "../../app/components";

export type BestPracticesProps = {
	title: string;
	practices: string[];
};

export function BestPractices({ title, practices }: BestPracticesProps) {
	return (
		<AppPanel className="justify-self-end space-y-3">
			<AppSectionTitle className="text-base">
				{title}
			</AppSectionTitle>
			<motion.ul className="list-disc space-y-2 pl-4 text-sm leading-6 text-[var(--text-secondary)]">
				{practices.map((practice, index) => (
					<motion.li key={index}>{practice}</motion.li>
				))}
			</motion.ul>
		</AppPanel>
	);
}
