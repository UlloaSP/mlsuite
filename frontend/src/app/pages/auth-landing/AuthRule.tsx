/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function AuthRule({
	thick = false,
	className = "",
}: {
	thick?: boolean;
	className?: string;
}) {
	return (
		<div
			aria-hidden="true"
			className={`relative z-10 mx-5 shrink-0 bg-[#111] sm:mx-7 lg:mx-[44px] ${thick ? "h-[3px]" : "h-px"} ${className}`}
		/>
	);
}
