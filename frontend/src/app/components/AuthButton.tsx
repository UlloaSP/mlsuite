/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function AuthButton({
	provider,
	isLoggedIn,
	currentProvider,
	onLogin,
	onLogout,
}: any) {
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

	const config: any = getProviderConfig();
	const handleClick = () => {
		if (isCurrentProvider) {
			onLogout();
		} else {
			onLogin();
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-all active:scale-[0.98] ${config.colors.bg} ${config.colors.hover} ${config.colors.text}`}
		>
			<img
				src={providerLogo}
				alt=""
				aria-hidden="true"
				className="size-[18px] shrink-0"
			/>
			<span className="text-sm">
				{isCurrentProvider ? "Logout" : `${config.name} Login`}
			</span>
		</button>
	);
}
