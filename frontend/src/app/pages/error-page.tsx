/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Check, Home, X } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { AppPage } from "../components";

function MLLogo() {
	return (
		<svg width="26" height="26" viewBox="0 0 48 48" fill="none" aria-hidden="true">
			<rect width="48" height="48" rx="12" fill="#ff385c" />
			<circle cx="14" cy="18" r="3" fill="white" opacity=".9" />
			<circle cx="14" cy="30" r="3" fill="white" opacity=".9" />
			<circle cx="24" cy="12" r="3" fill="white" />
			<circle cx="24" cy="24" r="3" fill="white" />
			<circle cx="24" cy="36" r="3" fill="white" />
			<circle cx="34" cy="18" r="3" fill="white" opacity=".9" />
			<circle cx="34" cy="30" r="3" fill="white" opacity=".9" />
			<path d="M14 18 24 12m-10 6 10 6m-10 6 10-6m-10 6 10 6m0-24 10 6m-10 6 10-6m-10 6 10 6m-10 6 10-6" stroke="white" strokeWidth="1.2" opacity=".5" />
		</svg>
	);
}

export function NotFoundError() {
	const navigate = useNavigate();
	const currentDate = new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date());

	return (
		<AppPage className="min-h-dvh bg-[#fdfcf8] text-[#111111]">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="relative flex min-h-dvh w-full flex-col overflow-hidden font-[var(--font-display)]"
			>
				{[1, 2, 3, 4, 5, 6, 7].map((index) => (
					<div
						key={index}
						className="pointer-events-none absolute bottom-0 top-0 w-px bg-black/[0.04]"
						style={{ left: `${index * (100 / 8)}%` }}
					/>
				))}

				<header className="relative z-10 shrink-0 px-6 pt-5 sm:px-11">
					<div className="mb-2.5 flex items-center justify-between font-mono text-[10px] uppercase text-[#aaa]">
						<span>Error Registry - Vol. 4</span>
						<span>{currentDate}</span>
					</div>
					<div className="mb-1.5 h-0.5 bg-[#111]" />
					<div className="flex items-center justify-center gap-2.5 py-2.5">
						<MLLogo />
						<span className="text-[26px] font-bold leading-none">MLSuite</span>
					</div>
					<div className="h-px bg-[#111]" />
					<div className="mt-[3px] h-[3px] bg-[#111]" />
				</header>

				<main className="relative z-10 flex flex-1 flex-col justify-between px-6 pb-10 sm:px-11 lg:flex-row lg:items-end lg:justify-start lg:pb-[52px]">
					<section className="border-black/10 pt-7 lg:flex-[0_0_58%] lg:border-r lg:pr-[52px]">
						<p className="mb-2.5 font-mono text-[10px] uppercase text-[#ff385c]">
							HTTP 404 - Page Not Found
						</p>
						<div className="flex items-baseline text-[7rem] font-bold leading-[0.88] text-[#111] sm:text-[8.75rem]">
							<span>4</span>
							<span className="text-transparent [-webkit-text-stroke:2.5px_#111]">
								0
							</span>
							<span>4</span>
						</div>
						<h1 className="mt-5 text-[28px] font-bold leading-tight text-[#111]">
							This page doesn&apos;t exist.
						</h1>
						<p className="mt-3 max-w-[360px] text-[13px] leading-7 text-[#888]">
							The route you requested couldn&apos;t be found - it may have moved,
							been deleted, or never existed. Check the URL or navigate back to safety.
						</p>
					</section>

					<section className="mt-10 lg:mt-0 lg:flex-1 lg:pl-11">
						<p className="mb-5 font-mono text-[10px] uppercase text-[#aaa]">What now?</p>
						<div className="flex flex-col gap-2.5">
							<button
								type="button"
								onClick={() => navigate("/")}
								className="flex w-full items-center justify-center gap-[9px] rounded-lg bg-[#ff385c] px-[18px] py-3 text-sm font-semibold text-white transition hover:bg-[#e8294d]"
							>
								<Home className="h-[15px] w-[15px]" />
								Go to Dashboard
							</button>
							<button
								type="button"
								onClick={() => navigate(-1)}
								className="flex w-full items-center justify-center gap-[9px] rounded-lg border-[1.5px] border-[#ddd] bg-white px-[18px] py-3 text-sm font-semibold text-[#222] transition hover:border-[#ccc] hover:bg-[#f5f5f5]"
							>
								<ArrowLeft className="h-[15px] w-[15px]" />
								Go Back
							</button>
						</div>

						<div className="mt-6 rounded-r-md border-l-2 border-[#ff385c] bg-[#ff385c]/[0.04] px-4 py-3.5">
							<p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
								<Check className="h-3.5 w-3.5 text-[#22c55e]" />
								API services operational
							</p>
							<p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
								<Check className="h-3.5 w-3.5 text-[#22c55e]" />
								Auth provider reachable
							</p>
							<p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
								<X className="h-3.5 w-3.5 text-[#ff385c]" />
								Requested route: not found
							</p>
						</div>
					</section>
				</main>
			</motion.div>
		</AppPage>
	);
}
