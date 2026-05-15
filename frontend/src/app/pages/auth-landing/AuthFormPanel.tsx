/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { AUTH_COPY, type AuthMode } from "./authLandingCopy";
import { BackButton } from "./BackButton";
import { FormSentence } from "./FormSentence";

export function AuthFormPanel({
	mode,
	modes,
	busy,
	error,
	onModeChange,
	onSubmit,
}: {
	mode: AuthMode;
	modes: readonly AuthMode[];
	busy: boolean;
	error?: unknown;
	onModeChange: (mode: AuthMode | null) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	const canSwitch = modes.length > 1;

	return (
		<div>
			<div className="mb-[22px] flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between xl:mb-7">
				<div
					className="inline-flex max-w-full border border-[#111] dark:border-[#f5f5f5]"
					role="tablist"
					aria-label="Authentication mode"
				>
					{modes.map((item) => (
						<button
							key={item}
							type="button"
							role="tab"
							aria-selected={mode === item}
							onClick={() => onModeChange(item)}
							className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] transition [font-family:'DM_Mono',monospace] sm:px-3.5 sm:text-[10px] xl:px-[18px] xl:py-2 xl:text-[11px] ${mode === item ? "bg-[#111] text-[#fdfcf8] dark:bg-[#f5f5f5] dark:text-[#101418]" : "bg-transparent text-[#111] hover:bg-black/5 dark:text-[#f5f5f5] dark:hover:bg-white/10"}`}
						>
							{AUTH_COPY[item].tab}
						</button>
					))}
				</div>

				{canSwitch ? <BackButton onClick={() => onModeChange(null)} /> : null}
			</div>

			<form onSubmit={onSubmit}>
				<FormSentence mode={mode} disabled={busy} />

				<div className="mt-6 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center xl:mt-8 xl:gap-[18px]">
					<button
						type="submit"
						disabled={busy}
						className="bg-[#111] px-[22px] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#ff385c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f5f5f5] dark:text-[#101418] dark:hover:bg-[#ff385c] dark:hover:text-white xl:px-7 xl:py-[13px] xl:text-base"
					>
						{AUTH_COPY[mode].submit}
					</button>
					{canSwitch ? (
						<button
							type="button"
							onClick={() => onModeChange(mode === "login" ? "register" : "login")}
							className="bg-transparent p-0 text-left text-[11px] text-[#999] transition [font-family:'DM_Mono',monospace] hover:text-[#ff385c] dark:text-[#8d97a3] sm:text-center xl:text-[13px]"
						>
							{AUTH_COPY[mode].switch}
						</button>
					) : null}
				</div>

				{error ? (
					<p className="mt-3.5 text-[11px] font-semibold text-[#c13515] dark:text-[#fda4af]">
						Sign in failed.
					</p>
				) : null}
				<p className="mt-3.5 text-[10px] tracking-[0.06em] text-[#bbb] [font-family:'DM_Mono',monospace] xl:mt-[18px] xl:text-[11px]">
					{AUTH_COPY[mode].foot}
				</p>
			</form>
		</div>
	);
}
