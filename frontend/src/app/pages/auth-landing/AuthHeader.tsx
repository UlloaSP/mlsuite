/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { APP_NAME, DATE_FORMATTER, ISSUE_LABEL } from "./authLandingCopy";
import { AuthRule } from "./AuthRule";

export function AuthHeader() {
	const now = new Date();
	const date = DATE_FORMATTER.format(now);
	const today = now.toISOString().slice(0, 10);

	return (
		<header className="relative z-10 shrink-0">
			<div className="mb-2.5 flex items-center justify-between gap-4 px-5 pt-[18px] text-[9px] uppercase tracking-[0.08em] text-[#aaa] [font-family:'DM_Mono',monospace] sm:px-7 sm:text-[10px] lg:px-[44px]">
				<span>{ISSUE_LABEL}</span>
				<time dateTime={today}>{date}</time>
			</div>

			<AuthRule thick className="h-0.5" />

			<div className="flex items-center justify-center gap-2.5 px-5 py-2.5 sm:px-7 lg:px-[44px]">
				<span className="text-2xl font-bold leading-none tracking-[-1px] sm:text-[28px]">
					{APP_NAME}
				</span>
			</div>

			<AuthRule />
			<AuthRule thick className="mt-[3px]" />
		</header>
	);
}
