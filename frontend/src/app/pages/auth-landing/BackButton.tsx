/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BACK_LABEL } from "./authLandingCopy";

export function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Back to authentication options"
			className="group inline-flex items-center gap-2 border-b border-transparent pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#999] transition hover:border-[#ff385c] hover:text-[#ff385c] xl:text-[11px]"
		>
			<span className="transition group-hover:-translate-x-1">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M19 12H5M11 6l-6 6 6 6"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
					/>
				</svg>
			</span>
			{BACK_LABEL}
		</button>
	);
}
