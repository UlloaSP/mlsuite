/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { Outlet } from "react-router";
import { sidebarCollapsedAtom } from "../app/atoms";
import { AppHeader, Sidebar } from "../app/components";

export function AppShellLayout() {
	const [collapsed] = useAtom(sidebarCollapsedAtom);

	return (
		<div className="flex h-screen w-screen flex-col bg-[var(--page-bg)] text-[var(--text-primary)]">
			<AppHeader />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="relative min-w-0 flex-1 overflow-hidden">
					<Outlet />
				</div>
				<motion.div
					className="hidden shrink-0 border-l border-[var(--border-soft)] will-change-[width] xl:block"
					animate={{ width: collapsed ? 52 : 260 }}
					transition={{ duration: 0.1, ease: "easeInOut" }}
				>
					<Sidebar />
				</motion.div>
			</div>
		</div>
	);
}
