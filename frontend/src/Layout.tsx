/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { Outlet } from "react-router";
import { sidebarCollapsedAtom } from "./app/atoms";
import { Sidebar } from "./app/components";
import { useUser } from "./user/hooks";

function Layout() {
	const { data: user } = useUser();
	const [collapsed] = useAtom(sidebarCollapsedAtom);

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
			<div className="relative flex-1 overflow-hidden">
				<Outlet />
			</div>
			{user ? (
				<motion.div
					className="hidden shrink-0 border-l border-[var(--border-soft)] will-change-[width] xl:block"
					animate={{ width: collapsed ? 52 : 260 }}
					transition={{ duration: 0.1, ease: "easeInOut" }}
				>
					<Sidebar />
				</motion.div>
			) : null}
		</div>
	);
}

export default Layout;
