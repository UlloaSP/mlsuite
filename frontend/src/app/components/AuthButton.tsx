import { Chrome, Github } from "lucide-react";
import { motion } from "motion/react";

export function AuthButton({
	provider,
	isLoggedIn,
	currentProvider,
	onLogin,
	onLogout,
}: any) {
	const isCurrentProvider = isLoggedIn && currentProvider === provider;

	const getProviderConfig = () => {
		switch (provider) {
			case "google":
				return {
					icon: <Chrome size={18} />,
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
					icon: <Github size={18} />,
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

	const config: any = getProviderConfig();
	const handleClick = () => {
		if (isCurrentProvider) {
			onLogout();
		} else {
			onLogin();
		}
	};

	return (
		<motion.button
			onClick={handleClick}
			className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${config.colors.bg} ${config.colors.hover} ${config.colors.text}`}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			{config.icon}
			<span className="text-sm">
				{isCurrentProvider ? "Logout" : `${config.name} Login`}
			</span>
		</motion.button>
	);
}
