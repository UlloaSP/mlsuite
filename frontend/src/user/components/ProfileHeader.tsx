/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { AppBadge, AppCopy, AppEyebrow } from "../../app/components";

export type ProfileHeaderProps = {
	imageUrl: string;
	name: string;
	provider: string;
};

export function ProfileHeader({
	imageUrl,
	name,
	provider,
}: ProfileHeaderProps) {
	return (
		<motion.div
			initial={{ scale: 0.9 }}
			animate={{ scale: 1 }}
			transition={{ delay: 0.3 }}
			className="mb-8 flex-1 self-center justify-self-center text-center"
		>
			<motion.div className="relative inline-block">
				<motion.img
					src={imageUrl}
					alt="Profile"
					className="mx-auto mb-4 h-32 w-32 rounded-full border-4 border-[var(--surface-primary)] shadow-[var(--shadow-card)]"
					referrerPolicy="no-referrer"
				/>
				<motion.div
					className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-[var(--surface-primary)] bg-[var(--accent-primary)]"
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.5, type: "spring" }}
				/>
			</motion.div>
			<AppEyebrow className="mb-3">Profile</AppEyebrow>
			<motion.h1 className="mb-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
				{name}
			</motion.h1>
			<AppCopy className="mb-3">
				{provider}
			</AppCopy>
			<AppBadge tone="accent">Workspace Identity</AppBadge>
		</motion.div>
	);
}
