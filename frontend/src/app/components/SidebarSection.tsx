/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./ui";

export function SidebarSection({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={cx("flex flex-col gap-2.5", className)}>{children}</div>;
}
