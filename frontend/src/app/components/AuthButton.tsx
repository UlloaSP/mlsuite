/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { SidebarTile } from "./SidebarTile";

export function AuthButton({
	provider,
	isLoggedIn,
	currentProvider,
	onLogin,
	onLogout,
	collapsed = false,
}: {
	provider: "google" | "github";
	isLoggedIn: boolean;
	currentProvider: string | null;
	onLogin: () => void;
	onLogout: () => void;
	collapsed?: boolean;
}) {
	const isCurrentProvider = isLoggedIn && currentProvider === provider;
	const providerLogo =
		provider === "google"
			? "/chrome-filled-svgrepo-com.svg"
			: "/github-svgrepo-com.svg";

	const getProviderConfig = () => {
		switch (provider) {
			case "google":
				return {
					name: "Google",
					colors: {
						bg: "bg-red-50 dark:bg-red-950",
						hover: "hover:bg-red-100 dark:hover:bg-red-900",
						text: "text-red-600 dark:text-red-400",
						border: "border-red-200 dark:border-red-800",
					},
				};
			case "github":
				return {
					name: "GitHub",
					colors: {
						bg: "bg-gray-50 dark:bg-gray-800",
						hover: "hover:bg-gray-100 dark:hover:bg-gray-700",
						text: "text-gray-700 dark:text-gray-300",
						border: "border-gray-200 dark:border-gray-600",
					},
				};
		}
	};

	const config = getProviderConfig();
	const ProviderIcon = ({ className = "" }: { className?: string }) => (
		<img
			src={providerLogo}
			alt=""
			aria-hidden="true"
			className={`size-[18px] shrink-0 ${className}`}
		/>
	);
	const handleClick = () => {
		if (isCurrentProvider) {
			onLogout();
		} else {
			onLogin();
		}
	};

	return (
		<SidebarTile
			icon={ProviderIcon}
			label={isCurrentProvider ? "Logout" : `${config.name} Login`}
			variant="auth"
			collapsed={collapsed}
			onClick={handleClick}
			className={`${config.colors.bg} ${config.colors.hover} ${config.colors.text}`}
		/>
	);
}
