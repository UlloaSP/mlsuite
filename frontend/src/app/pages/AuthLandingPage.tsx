/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { useState } from "react";
import { useLogin, useRegister, useUser } from "../../user/hooks";
import { AppPage } from "../components";
import { MLSuiteMark } from "../components/MLSuiteMark";

type AuthMode = "login" | "register" | null;

export function AuthLandingPage() {
	const [mode, setMode] = useState<AuthMode>(null);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fullName, setFullName] = useState("");
	const login = useLogin();
	const register = useRegister();
	const { isLoading } = useUser();
	const busy = login.isPending || register.isPending || isLoading;
	const currentDate = new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date());

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (mode === "login") {
			login.mutate({ email, password });
			return;
		}
		register.mutate({ email, password, fullName });
	};

	const inlineInputClass =
		"min-w-[140px] border-0 border-b border-dashed border-[#999] bg-transparent px-1 py-[2px] text-[20px] font-medium italic text-[#111] outline-none transition [font-family:'Space_Grotesk',sans-serif] placeholder:italic placeholder:text-[#bbb] focus:border-b focus:border-solid focus:border-[#ff385c] xl:text-[28px] 2xl:text-[32px]";

	return (
		<AppPage
			className="min-h-screen overflow-hidden bg-[#fdfcf8] text-[#111111]"
			style={{ fontFamily: "'Space Grotesk', sans-serif" }}
		>
			<div className="relative flex min-h-screen w-full flex-col overflow-hidden">
				{[1, 2, 3, 4, 5, 6, 7].map((index) => (
					<div
						key={index}
						className="pointer-events-none absolute bottom-0 top-0 w-px bg-black/[0.04]"
						style={{ left: `${index * (100 / 8)}%` }}
					/>
				))}

				<div className="relative z-10 mb-[10px] flex shrink-0 items-center justify-between px-[44px] pt-[18px]">
					<span
						className="text-[10px] uppercase tracking-[0.08em] text-[#aaa]"
						style={{ fontFamily: "'DM Mono', monospace" }}
					>
						Vol. 2 · Issue 4
					</span>
					<span
						className="text-[10px] uppercase tracking-[0.08em] text-[#aaa]"
						style={{ fontFamily: "'DM Mono', monospace" }}
					>
						<span>{currentDate}</span>
					</span>
				</div>
				<div className="relative z-10 mx-[44px] h-[2px] shrink-0 bg-[#111]" />
				<div className="relative z-10 flex shrink-0 items-center justify-center gap-[10px] px-[44px] py-[10px]">
					<MLSuiteMark />
					<span className="text-[28px] font-bold leading-none tracking-[-1px]">MLSuite</span>
				</div>
				<div className="relative z-10 mx-[44px] h-px shrink-0 bg-[#111]" />
				<div className="relative z-10 mx-[44px] mt-[3px] h-[3px] shrink-0 bg-[#111]" />

				<div className="relative z-10 flex flex-1 items-end px-[44px] pb-[48px]">
					<div className="flex-[0_0_58%] border-r border-black/10 pr-[44px]">
						<p
							className="mb-[10px] mt-[28px] text-[10px] uppercase tracking-[0.12em] text-[#ff385c]"
							style={{ fontFamily: "'DM Mono', monospace" }}
						>
							Machine Learning Infrastructure
						</p>
						<h1 className="mb-[18px] text-[60px] font-bold leading-[0.95] tracking-[-2.5px] text-[#111] xl:text-[76px] 2xl:text-[88px]">
							The suite that
							<br />
							runs your
							<br />
							<span className="text-transparent [-webkit-text-stroke:2px_#111]">
								models.
							</span>
						</h1>
						<p className="max-w-[360px] text-[13px] leading-[1.75] text-[#777] xl:max-w-[460px] xl:text-[16px] 2xl:max-w-[520px] 2xl:text-[18px]">
							From first experiment to production deployment — one platform, zero friction.
						</p>
					</div>
					<div className="flex flex-1 flex-col self-stretch pl-[44px]">
						<div className="mt-auto">
							{mode === null ? (
								<div className="flex flex-col gap-[10px] transition-opacity duration-200">
									<p
										className="mb-[6px] text-[10px] uppercase tracking-[0.1em] text-[#aaa]"
										style={{ fontFamily: "'DM Mono', monospace" }}
									>
										Sign in
									</p>
									<button
										type="button"
										onClick={() => setMode("login")}
										className="flex w-full items-center justify-center gap-2 rounded-[6px] border-[1.5px] border-[#ddd] bg-white px-[18px] py-[14px] text-[14px] font-semibold text-[#222] transition hover:border-[#ccc] hover:bg-[#f5f5f5] xl:px-[22px] xl:py-[16px] xl:text-[16px]"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											<path d="m10 17 5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											<path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
										Iniciar sesión
									</button>
									<button
										type="button"
										onClick={() => setMode("register")}
										className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#111] px-[18px] py-[14px] text-[14px] font-semibold text-white transition hover:bg-[#ff385c] xl:px-[22px] xl:py-[16px] xl:text-[16px]"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											<circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
											<path d="M20 8v6M17 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
										Crear cuenta
									</button>
									<p
										className="mt-[8px] text-[11px] tracking-[0.05em] text-[#aaa]"
										style={{ fontFamily: "'DM Mono', monospace" }}
									>
										Use your MLSuite account to enter the workspace.
									</p>
								</div>
							) : (
								<div className="animate-[rise-in_.35s_cubic-bezier(.2,.7,.2,1)]">
									<div className="mb-[22px] flex items-center justify-between xl:mb-[28px]">
										<div className="inline-flex border border-[#111]">
											<button
												type="button"
												onClick={() => setMode("login")}
												className={`px-[14px] py-[7px] text-[10px] uppercase tracking-[0.14em] xl:px-[18px] xl:py-[9px] xl:text-[11px] ${mode === "login"
													? "bg-[#111] text-[#fdfcf8]"
													: "bg-transparent text-[#111] hover:bg-black/[0.05]"
													}`}
												style={{ fontFamily: "'DM Mono', monospace" }}
											>
												Iniciar sesión
											</button>
											<button
												type="button"
												onClick={() => setMode("register")}
												className={`px-[14px] py-[7px] text-[10px] uppercase tracking-[0.14em] xl:px-[18px] xl:py-[9px] xl:text-[11px] ${mode === "register"
													? "bg-[#111] text-[#fdfcf8]"
													: "bg-transparent text-[#111] hover:bg-black/[0.05]"
													}`}
												style={{ fontFamily: "'DM Mono', monospace" }}
											>
												Crear cuenta
											</button>
										</div>
										<button
											type="button"
											onClick={() => setMode(null)}
											className="bg-none p-1 text-[10px] uppercase tracking-[0.1em] text-[#999] transition hover:text-[#ff385c] xl:text-[11px]"
											style={{ fontFamily: "'DM Mono', monospace" }}
										>
											✕ close
										</button>
									</div>
									<form
										onSubmit={submit}
										className="animate-[fade-in_.25s_ease-out]"
									>
										{mode === "login" ? (
											<p className="text-[20px] font-normal leading-[1.7] tracking-[-0.3px] text-[#111] xl:text-[28px] 2xl:text-[32px]">
												I&apos;m{" "}
												<input
													required
													type="email"
													autoComplete="email"
													placeholder="my email"
													value={email}
													onChange={(event) => setEmail(event.target.value)}
													className={`${inlineInputClass} min-w-[200px] xl:min-w-[280px] 2xl:min-w-[320px]`}
												/>{" "}
												and my password is{" "}
												<input
													required
													type="password"
													minLength={10}
													autoComplete="current-password"
													placeholder="••••••"
													value={password}
													onChange={(event) => setPassword(event.target.value)}
													className={`${inlineInputClass} tracking-[4px] xl:min-w-[190px] 2xl:min-w-[220px]`}
												/>
												.
											</p>
										) : (
											<p className="text-[20px] font-normal leading-[1.7] tracking-[-0.3px] text-[#111] xl:text-[28px] 2xl:text-[32px]">
												Hi, I&apos;m{" "}
												<input
													required
													type="text"
													autoComplete="name"
													placeholder="my name"
													value={fullName}
													onChange={(event) => setFullName(event.target.value)}
													className={`${inlineInputClass} min-w-[170px] xl:min-w-[230px] 2xl:min-w-[260px]`}
												/>
												. You can reach me at{" "}
												<input
													required
													type="email"
													autoComplete="email"
													placeholder="email"
													value={email}
													onChange={(event) => setEmail(event.target.value)}
													className={`${inlineInputClass} min-w-[200px] xl:min-w-[280px] 2xl:min-w-[320px]`}
												/>{" "}
												and I&apos;d like my password to be{" "}
												<input
													required
													type="password"
													minLength={10}
													autoComplete="new-password"
													placeholder="••••••"
													value={password}
													onChange={(event) => setPassword(event.target.value)}
													className={`${inlineInputClass} tracking-[4px] xl:min-w-[190px] 2xl:min-w-[220px]`}
												/>
												.
											</p>
										)}
										<div className="mt-6 flex items-center gap-[14px] xl:mt-8 xl:gap-[18px]">
											<button
												type="submit"
												disabled={busy}
												className="bg-[#111] px-[22px] py-[10px] text-[13px] font-semibold text-white transition hover:bg-[#ff385c] disabled:cursor-not-allowed disabled:opacity-60 xl:px-[28px] xl:py-[13px] xl:text-[16px]"
											>
												{busy
													? "Working..."
													: mode === "login"
														? "Take me in →"
														: "Create my account →"}
											</button>
											<button
												type="button"
												onClick={() => setMode(mode === "login" ? "register" : "login")}
												className="bg-transparent p-0 text-[11px] text-[#999] transition hover:text-[#ff385c] xl:text-[13px]"
												style={{ fontFamily: "'DM Mono', monospace" }}
											>
												{mode === "login" ? "or create account" : "or sign in"}
											</button>
										</div>
										<p
											className="mt-[14px] text-[10px] tracking-[0.06em] text-[#bbb] xl:mt-[18px] xl:text-[11px]"
											style={{ fontFamily: "'DM Mono', monospace" }}
										>
											{mode === "login"
												? "Forgot password?"
												: "By signing up, you agree to the Terms."}
										</p>
									</form>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</AppPage>
	);
}
