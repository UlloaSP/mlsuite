/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AUTH_COPY, type AuthMode } from "./authLandingCopy";

export function AuthButton({
	type,
	onClick,
}: {
	type: AuthMode;
	onClick: () => void;
}) {
	const variant =
		type === "register"
			? "bg-[#111] text-white hover:bg-[#ff385c]"
			: "border-[1.5px] border-[#ddd] bg-white text-[#222] hover:border-[#ccc] hover:bg-[#f5f5f5]";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center justify-center gap-2 rounded-md px-[18px] py-3.5 text-sm font-semibold transition xl:px-[22px] xl:py-4 xl:text-base ${variant}`}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				{type === "login" ? (
					<path
						d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
					/>
				) : (
					<>
						<path
							d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M20 8v6M17 11h6"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
						/>
						<circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
					</>
				)}
			</svg>
			{AUTH_COPY[type].tab}
		</button>
	);
}
