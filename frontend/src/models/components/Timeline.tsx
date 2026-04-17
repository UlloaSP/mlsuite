/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";

const container = {
	hidden: { opacity: 0, x: -40 },
	show: {
		opacity: 1,
		x: 0,
		transition: { staggerChildren: 0.12, duration: 0.5 },
	},
};
const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

export type TimelineProps = {
	steps: {
		icon: React.ComponentType<{ size?: number }>;
		label: string;
	}[];
};

export function Timeline({ steps }: TimelineProps) {
	return (
		<motion.ul
			variants={container}
			initial="hidden"
			animate="show"
			className="relative justify-self-start space-y-7"
		>
			<span className="absolute bottom-0 left-5 top-0 w-px bg-[var(--border-soft)]" />
			{steps.map(({ icon: Icon, label }, idx) => (
				<motion.li
					key={idx}
					variants={item}
					className="flex items-center gap-3"
				>
					<span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--accent-primary)] shadow-[var(--shadow-card)]">
						<Icon size={18} />
					</span>
					<span className="text-sm font-medium text-[var(--text-primary)] md:text-base">
						{label}
					</span>
				</motion.li>
			))}
		</motion.ul>
	);
}
