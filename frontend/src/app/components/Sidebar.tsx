import { motion } from "motion/react";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavigation } from "./SidebarNavigation";

export function Sidebar() {
	return (
		<motion.div
			className="w-full h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col"
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
