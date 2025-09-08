import { LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useLogout, useUser } from "../../user/hooks";
import { AuthButton } from "./AuthButton";

export function SidebarFooter() {
	const { data: user } = useUser();
	const { mutate: logout } = useLogout();

	const navigate = useNavigate();

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
		<div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
			{user ? (
				// Logged in state: Show provider label and logout button
				<div className="space-y-2">
					<div className="text-center py-1">
						<span className="text-xs text-gray-500 dark:text-gray-400">
							Logged in with {getProviderDisplayName()}
						</span>
					</div>
					<motion.button
						onClick={() => {
							logout();
							navigate("/");
						}}
						className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${getProviderColors().bg
							} ${getProviderColors().hover} ${getProviderColors().text}`}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<LogOut size={18} />
						<span className="text-sm">Log Out</span>
					</motion.button>
				</div>
			) : (
				// Logged out state: Show all auth buttons
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
