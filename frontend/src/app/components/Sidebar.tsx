/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { SidebarNavigation } from "./SidebarNavigation";

export function Sidebar() {
	return (
		<div className="flex size-full flex-col overflow-hidden bg-[var(--sidebar-bg)] backdrop-blur-xl">
			<SidebarNavigation />
		</div>
	);
}
