/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// src/app/components/SidebarNavigation.tsx
import { useAtom } from "jotai";
import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	Blocks,
	BrainCircuit,
	Building2,
	LayoutGrid,
	List,
	Maximize,
	Minimize,
	Moon,
	PanelRightClose,
	PanelRightOpen,
	Server,
	ServerCog,
	ShieldCheck,
	SquareTerminal,
	Sun,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import { fullscreenAtom, sidebarCollapsedAtom, themeWithHtmlAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";
import { cx, FOCUS_RING } from "./ui";

type NavigationItem = {
	to: string;
	icon: LucideIcon;
	label: string;
	children?: Array<{ to: string; icon: LucideIcon; label: string }>;
};

const INFRA_CHILDREN: NavigationItem["children"] = [
	{ to: "/admin/infrastructure", icon: LayoutGrid, label: "Overview" },
	{ to: "/admin/infrastructure?tab=services", icon: Server, label: "Services" },
	{ to: "/admin/infrastructure?tab=logs", icon: List, label: "Logs" },
	{ to: "/admin/infrastructure?tab=terminal", icon: SquareTerminal, label: "Terminal" },
	{ to: "/admin/infrastructure?tab=alerts", icon: AlertTriangle, label: "Alerts" },
];

export function Sidebar() {
	const location = useLocation();
	const [theme, setTheme] = useAtom(themeWithHtmlAtom);
	const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
	const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
	const { data: user } = useUser();
	const { data: workspace } = useWorkspaceContext();
	const permissions = workspace?.permissions;

	const currentPath = `${location.pathname}${location.search}`;
	const navigation: NavigationItem[] = [
		...(permissions?.canViewWorkspace
			? [{ to: "/workspace", icon: Building2, label: "Workspace" }]
			: []),
		...(permissions?.canViewModels
			? [{ to: "/models", icon: BrainCircuit, label: "Catalog" }]
			: []),
		...(permissions?.canViewPlugins
			? [{ to: "/plugins", icon: Blocks, label: "Plugins" }]
			: []),
		...(user?.systemRole === "SUPERADMIN"
			? [
				{ to: "/admin/users", icon: ShieldCheck, label: "Admin" },
				{
					to: "/admin/infrastructure",
					icon: ServerCog,
					label: "Infra",
					children: INFRA_CHILDREN,
				},
			]
			: []),
	];

	return (
		<div className="flex size-full flex-col overflow-hidden bg-[var(--sidebar-bg)] backdrop-blur-xl">
			<div className="flex flex-1 flex-col overflow-hidden">
				<nav
					aria-label="Main navigation"
					className="app-scroll flex-1 overflow-y-auto"
				>
					<SidebarSection collapsed={collapsed} className="p-4">
						{navigation.map((item) => (
							<div key={item.to} className="space-y-1">
								<Link
									to={item.to}
									className={cx(FOCUS_RING, "flex rounded-xl")}
								>
									<SidebarTile
										icon={item.icon}
										label={item.label}
										isActive={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
										variant="navigation"
										collapsed={collapsed}
									/>
								</Link>
								{!collapsed &&
									item.children &&
									location.pathname.startsWith(item.to) && (
										<div className="ml-6 space-y-1 border-l border-[var(--border-soft)] pl-3">
											{item.children.map((child) => {
												const active =
													currentPath === child.to ||
													(child.to === item.to && currentPath === `${item.to}?tab=overview`);
												const Icon = child.icon;
												return (
													<Link
														key={child.to}
														to={child.to}
														className={cx(
															FOCUS_RING,
															"flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
															active
																? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
																: "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
														)}
													>
														<Icon size={14} className="shrink-0" />
														<span className="truncate">{child.label}</span>
													</Link>
												);
											})}
										</div>
									)}
							</div>
						))}
					</SidebarSection>
				</nav>

				<SidebarSection collapsed={collapsed} className="border-t p-4">
					<SidebarTile
						icon={theme === "light" ? Moon : Sun}
						label={theme === "light" ? "Dark Mode" : "Light Mode"}
						variant="action"
						collapsed={collapsed}
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
					/>

					<SidebarTile
						icon={isFullscreen ? Minimize : Maximize}
						label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
						variant="action"
						collapsed={collapsed}
						onClick={() => {
							if (!document.fullscreenElement) {
								document.documentElement
									.requestFullscreen()
									.then(() => setIsFullscreen(true));
							} else {
								document.exitFullscreen().then(() => setIsFullscreen(false));
							}
						}}
					/>

					<SidebarTile
						icon={collapsed ? PanelRightOpen : PanelRightClose}
						label={collapsed ? "Expand" : "Collapse"}
						variant="action"
						collapsed={collapsed}
						ariaExpanded={!collapsed}
						onClick={() => setCollapsed((c) => !c)}
					/>
				</SidebarSection>
			</div>
		</div>
	);
}
