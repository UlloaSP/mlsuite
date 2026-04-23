/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LogOut } from "lucide-react";
import { useLogout, useUser } from "../../user/hooks";
import { AuthButton } from "./AuthButton";
import { SidebarTile } from "./SidebarTile";

export function SidebarFooter() {
	const { data: user } = useUser();
	const { mutate: logout } = useLogout();

	const handleLogin = (provider: any) => {
		window.location.href = `https://localhost:8443/oauth2/authorization/${provider}`;
	};

	const getProviderDisplayName = () => {
		return user?.oauthProvider === "google" ? "Google" : "GitHub";
	};

	const getProviderColors = () => {
		if (user?.oauthProvider === "google") {
			return {
				bg: "bg-red-50 dark:bg-red-950",
				hover: "hover:bg-red-100 dark:hover:bg-red-900",
				text: "text-red-600 dark:text-red-400",
			};
		} else {
			return {
				bg: "bg-gray-50 dark:bg-gray-800",
				hover: "hover:bg-gray-100 dark:hover:bg-gray-700",
				text: "text-gray-700 dark:text-gray-300",
			};
		}
	};

	return (
		<div className="space-y-3 border-t border-[var(--border-soft)] px-6 py-5">
			{user ? (
				<div className="space-y-2">
					<div className="px-1 py-1 text-center">
						<span className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
							Logged in with {getProviderDisplayName()}
						</span>
					</div>
					<SidebarTile
						icon={LogOut}
						label="Log Out"
						variant="auth"
						onClick={() => logout()}
						className={`${getProviderColors().bg} ${getProviderColors().hover} ${getProviderColors().text}`}
					/>
				</div>
			) : (
				<>
					<AuthButton
						provider="google"
						isLoggedIn={false}
						currentProvider={null}
						onLogin={() => handleLogin("google")}
						onLogout={logout}
					/>

					<AuthButton
						provider="github"
						isLoggedIn={false}
						currentProvider={null}
						onLogin={() => handleLogin("github")}
						onLogout={logout}
					/>
				</>
			)
			}
		</div >
	);
}
