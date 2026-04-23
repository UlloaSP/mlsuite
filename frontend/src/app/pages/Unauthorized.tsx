/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { useState } from "react";
import { AppPage } from "../components";
import { useUser } from "../../user/hooks";

function MLLogo({ size = 28 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
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

function GoogleIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
			<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
			<path d="M9 18c2.43 0 4.467-.806 5.956-2.185l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
			<path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
			<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
		</svg>
	);
}

function GitHubIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

export function Unauthorized() {
	const BACKEND = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
	const base = BACKEND || "";
	const [redirecting, setRedirecting] = useState<null | "google" | "github">(null);
	const { data: _, isLoading } = useUser();
	const currentDate = new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date());

	const login = (provider: "google" | "github") => {
		setRedirecting(provider);
		window.location.href = `${base}/oauth2/authorization/${provider}`;
	};

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
					<div className="mb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-[#aaa]">
						<span>Vol. 2 - Issue 4</span>
						<span>{currentDate}</span>
					</div>
					<div className="mb-1.5 h-0.5 bg-[#111]" />
					<div className="flex items-center justify-center py-2.5">
						<div className="flex items-center gap-2.5">
							<MLLogo />
							<span className="text-[28px] font-bold leading-none tracking-[-0.04em]">
								MLSuite
							</span>
						</div>
					</div>
					<div className="h-px bg-[#111]" />
					<div className="mt-[3px] h-[3px] bg-[#111]" />
				</header>

				<main className="relative z-10 flex flex-1 flex-col justify-between px-6 pb-10 sm:px-11 lg:flex-row lg:items-end lg:justify-start">
					<section className="border-black/10 pt-6 lg:flex-[0_0_58%] lg:border-r lg:pr-10">
						<p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#ff385c]">
							Machine Learning Infrastructure
						</p>
						<h1 className="m-0 text-[4.4rem] font-bold leading-[0.93] tracking-[-0.05em] sm:text-[5.6rem] lg:text-[5.25rem] xl:text-[6rem]">
							The suite that
							<br />
							runs your
							<br />
							<span className="text-transparent [-webkit-text-stroke:2px_#111]">
								models.
							</span>
						</h1>
						<p className="mt-4 max-w-[720px] text-xs leading-7 text-[#777]">
							From first experiment to production deployment - one platform, zero friction.
						</p>
					</section>

					<section className="mt-10 lg:mt-0 lg:flex-1 lg:pl-10">
						<p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#aaa]">
							Sign in
						</p>
						<div className="flex flex-col gap-[9px]">
							<button
								type="button"
								onClick={() => login("google")}
								aria-label="Sign in with Google"
								disabled={!!redirecting || isLoading}
								className="flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-[#ddd] bg-white px-4 py-[11px] text-[13px] font-semibold text-[#222] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-45"
							>
								<GoogleIcon />
								{redirecting === "google" || isLoading ? "Signing..." : "Google"}
							</button>
							<button
								type="button"
								onClick={() => login("github")}
								aria-label="Sign in with GitHub"
								disabled={!!redirecting || isLoading}
								className="flex w-full items-center justify-center gap-2 rounded-md bg-[#111] px-4 py-[11px] text-[13px] font-semibold text-white transition hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-45"
							>
								<GitHubIcon />
								{redirecting === "github" || isLoading ? "Signing..." : "GitHub"}
							</button>
						</div>
					</section>
				</main>
			</motion.div>
		</AppPage>
	);
}
