/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { LogOut } from "lucide-react";
import { useLogout, useUser } from "../../user/hooks";
import { sidebarCollapsedAtom } from "../atoms";
import { AuthButton } from "./AuthButton";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";

export function SidebarFooter() {
	const { data: user } = useUser();
	const { mutate: logout } = useLogout();
	const [collapsed] = useAtom(sidebarCollapsedAtom);

	const handleLogin = (provider: any) => {
		window.location.href = `https://localhost:8443/oauth2/authorization/${provider}`;
	};

	return (
		<SidebarSection collapsed={collapsed} className="border-t p-4">
			{user ? (

				<SidebarTile
					icon={LogOut}
					label="Log Out"
					variant="action"
					collapsed={collapsed}
					onClick={() => logout()}
				/>
			) : (
				<>
					<AuthButton
						provider="google"
						isLoggedIn={false}
						currentProvider={null}
						collapsed={collapsed}
						onLogin={() => handleLogin("google")}
						onLogout={logout}
					/>

					<AuthButton
						provider="github"
						isLoggedIn={false}
						currentProvider={null}
						collapsed={collapsed}
						onLogin={() => handleLogin("github")}
						onLogout={logout}
					/>
				</>
			)}
		</SidebarSection>
	);
}
