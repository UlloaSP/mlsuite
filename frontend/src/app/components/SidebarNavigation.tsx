/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// src/app/components/SidebarNavigation.tsx
import { useAtom } from "jotai";
import {
	BrainCircuit,
	Blocks,
	Maximize,
	Minimize,
	Moon,
	Sun,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { fullscreenAtom, themeWithHtmlAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";

export function SidebarNavigation() {
	const location = useLocation();
	const [theme, setTheme] = useAtom(themeWithHtmlAtom);
	const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
	const navigation = [
		{ to: "/models", icon: BrainCircuit, label: "Catalog" },
		{ to: "/plugins", icon: Blocks, label: "Plugins" },
	];

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<div className="app-scroll flex-1 overflow-y-auto px-6 py-5">
				<SidebarSection>
					{navigation.map((item) => (
						<Link key={item.to} to={item.to}>
							<SidebarTile
								icon={item.icon}
								label={item.label}
								isActive={location.pathname === item.to}
								variant="navigation"
							/>
						</Link>
					))}
				</SidebarSection>
			</div>

			<div className="border-t border-[var(--border-soft)] px-6 py-5">
				<SidebarSection>
					<SidebarTile
						icon={theme === "light" ? Moon : Sun}
						label={theme === "light" ? "Dark Mode" : "Light Mode"}
						variant="action"
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
					/>

					<SidebarTile
						icon={isFullscreen ? Minimize : Maximize}
						label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
						variant="action"
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
				</SidebarSection>
			</div>
		</div>
	);
}
