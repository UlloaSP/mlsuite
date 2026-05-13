/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { EYEBROW, HERO_DESCRIPTION, HERO_LINES } from "./authLandingCopy";

export function AuthHero() {
	return (
		<div className="pb-8 lg:flex-[0_0_58%] lg:pb-0 lg:pr-[44px]">
			<p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff385c] lg:mt-7">
				{EYEBROW}
			</p>

			<h1
				id="auth-title"
				className="mb-[18px] text-[42px] font-semibold leading-[0.95] tracking-[-1.8px] sm:text-[52px] md:text-[60px] lg:tracking-[-2.5px] xl:text-[76px] 2xl:text-[88px]"
			>
				{HERO_LINES[0]}
				<br />
				{HERO_LINES[1]}
				<br />
				<span className="text-transparent [-webkit-text-stroke:1.25px_#111] sm:[-webkit-text-stroke:1.5px_#111] lg:[-webkit-text-stroke:2px_#111]">
					{HERO_LINES[2]}
				</span>
			</h1>

			<p className="max-w-[520px] text-[13px] leading-[1.75] text-[#777] sm:max-w-[560px] xl:text-base 2xl:text-lg">
				{HERO_DESCRIPTION}
			</p>
		</div>
	);
}
