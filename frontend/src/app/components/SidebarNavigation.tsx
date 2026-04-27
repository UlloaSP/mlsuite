/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// src/app/components/SidebarNavigation.tsx
import { useAtom } from "jotai";
import {
	Blocks,
	BrainCircuit,
	Maximize,
	Minimize,
	Moon,
	PanelRightClose,
	PanelRightOpen,
	Sun,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { fullscreenAtom, sidebarCollapsedAtom, themeWithHtmlAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";
import { cx, FOCUS_RING } from "./ui";

export function SidebarNavigation() {
	const location = useLocation();
	const [theme, setTheme] = useAtom(themeWithHtmlAtom);
	const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
	const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

	const navigation = [
		{ to: "/models", icon: BrainCircuit, label: "Catalog" },
		{ to: "/plugins", icon: Blocks, label: "Plugins" },
	];

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<nav
				aria-label="Main navigation"
				className="app-scroll flex-1 overflow-y-auto"
			>
				<SidebarSection collapsed={collapsed} className="p-4">
					{navigation.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className={cx(FOCUS_RING, "flex rounded-xl")}
						>
							<SidebarTile
								icon={item.icon}
								label={item.label}
								isActive={location.pathname === item.to}
								variant="navigation"
								collapsed={collapsed}
							/>
						</Link>
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
	);
}
