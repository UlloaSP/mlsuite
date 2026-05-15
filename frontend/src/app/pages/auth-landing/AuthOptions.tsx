/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AUTH_HELP_TEXT, type AuthMode } from "./authLandingCopy";
import { AuthButton } from "./AuthButton";

export function AuthOptions({
	modes,
	onSelect,
}: {
	modes: readonly AuthMode[];
	onSelect: (mode: AuthMode) => void;
}) {
	return (
		<nav
			className="flex flex-col gap-2.5 transition-opacity duration-200"
			aria-label="Authentication options"
		>
			<p className="mb-1.5 text-[10px] uppercase tracking-[0.1em] text-[#aaa] [font-family:'DM_Mono',monospace] dark:text-[#8d97a3]">
				Sign in
			</p>
			{modes.map((mode) => (
				<AuthButton key={mode} type={mode} onClick={() => onSelect(mode)} />
			))}
			<p className="mt-2 text-[11px] tracking-[0.05em] text-[#aaa] [font-family:'DM_Mono',monospace] dark:text-[#8d97a3]">
				{AUTH_HELP_TEXT}
			</p>
		</nav>
	);
}
