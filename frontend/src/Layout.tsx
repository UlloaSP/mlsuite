/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Outlet } from "react-router";
import { Sidebar } from "./app/components";
import { useUser } from "./user/hooks";

function Layout() {
	const { data: user } = useUser();

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
			<div className="relative flex-1 overflow-hidden">
				<Outlet />
			</div>
			{user ? (
				<div className="hidden w-[320px] shrink-0 border-l border-[var(--border-soft)] xl:block">
					<Sidebar />
				</div>
			) : null}
		</div>
	);
}

export default Layout;
