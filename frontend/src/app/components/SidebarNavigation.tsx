// src/app/components/SidebarNavigation.tsx
import { useAtom } from "jotai";
import {
	BrainCircuit,
	Home,
	Maximize,
	Minimize,
	Moon,
	Sun,
	User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { fullscreenAtom, themeWithHtmlAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";

export function SidebarNavigation() {
	const location = useLocation();
	const [theme, setTheme] = useAtom(themeWithHtmlAtom);
	const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);

	const navigation = [
		{ to: "/", icon: Home, label: "Home" },
		{ to: "/profile", icon: User, label: "Profile" },
		{ to: "/models", icon: BrainCircuit, label: "Catalog" },
	];

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* Links navegables */}
			<div className="flex-1 overflow-y-auto p-4">
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

			{/* Acciones UI */}
			<div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
