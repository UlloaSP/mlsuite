/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavigation } from "./SidebarNavigation";

export function Sidebar() {
	return (
		<motion.div
			className="flex h-full w-full flex-col bg-[var(--sidebar-bg)] backdrop-blur-xl"
			initial={{ x: "100%" }}
			animate={{ x: 0 }}
			transition={{ duration: 0.3 }}
		>
			<SidebarHeader />
			<SidebarNavigation />
			<SidebarFooter />
		</motion.div>
	);
}
