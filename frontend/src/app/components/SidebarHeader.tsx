/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useUser } from "../../user/hooks"; // Adjust the import path as necessary

export function SidebarHeader() {
	const { data: user } = useUser();

	if (!user) {
		return null;
	}

	return (
		<Link
			to="/profile"
			className="block border-b border-[var(--border-soft)] px-6 py-6 transition hover:bg-[var(--surface-soft)]/50"
			aria-label="Open profile"
		>
			<div className="flex items-center gap-4">
				<img
					src={user?.avatarUrl}
					alt="User"
					className="size-14 rounded-full border border-[var(--border-soft)]"
					referrerPolicy="no-referrer"
				/>
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-[var(--text-primary)]">
						{user?.userName || user?.fullName || "Guest"}
					</p>
					<p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						Workspace
					</p>
				</div>
			</div>
		</Link>
	);
}
