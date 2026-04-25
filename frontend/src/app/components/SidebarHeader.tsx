/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { Link } from "react-router";
import { useUser } from "../../user/hooks";
import { sidebarCollapsedAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { cx, FOCUS_RING } from "./ui";

export function SidebarHeader() {
	const { data: user } = useUser();
	const [collapsed] = useAtom(sidebarCollapsedAtom);

	if (!user) {
		return null;
	}

	const displayName = user?.userName || user?.fullName || "Guest";

	const content = (
		<SidebarSection collapsed={collapsed} className="p-4 border-b">
			<Link
				to="/profile"
				className={cx(
					"block transition hover:bg-[var(--surface-soft)]/50",
					FOCUS_RING,
				)}
				aria-label={`Open profile for ${displayName}`}
			>
				<motion.div
					className="flex items-center"
					animate={{
						justifyContent: collapsed ? "center" : "flex-start",
						gap: collapsed ? 0 : 16,
					}}
					transition={{ duration: 0.25, ease: "easeInOut" }}
				>
					<motion.div
						className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border-soft)]"
						transition={{ duration: 0.25, ease: "easeInOut" }}
					>
						<img
							src={user?.avatarUrl}
							alt="User"
							className="w-[24px] h-[24px] rounded-full object-cover"
							referrerPolicy="no-referrer"
						/>
					</motion.div>
					{!collapsed && (
						<motion.div
							key="header-text"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="min-w-0"
						>
							<p className="ml-2 truncate text-xl font-semibold text-[var(--text-primary)]">
								{displayName}
							</p>
						</motion.div>
					)}
				</motion.div>
			</Link>
		</SidebarSection>
	);

	return content;
}
