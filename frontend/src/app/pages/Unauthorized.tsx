/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AppBadge, AppButton, AppCopy, AppPage, AppPanel, AppSectionTitle } from "../components";
import { useUser } from "../../user/hooks";

export function Unauthorized() {
    const BACKEND = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
    const base = BACKEND || "";
    const [redirecting, setRedirecting] = useState<null | "google" | "github">(null);
    const { data: _, isLoading } = useUser();

	const login = (provider: "google" | "github") => {
		setRedirecting(provider);
		window.location.href = `${base}/oauth2/authorization/${provider}`;
	};

	return (
		<AppPage className="min-h-dvh items-center justify-center">
			<motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex w-full max-w-2xl"
            >
				<AppPanel className="w-full space-y-8 p-10 text-center md:p-12">
					<div className="flex flex-col items-center gap-6" role="region" aria-labelledby="unauth-title">
						<div className="grid size-28 place-items-center rounded-[32px] border border-[var(--accent-quiet)] bg-[var(--surface-secondary)] text-[var(--accent-primary)] shadow-[var(--shadow-card)]">
							<Lock className="size-12" />
						</div>
						<AppBadge tone="accent">Secure access</AppBadge>
						<AppSectionTitle id="unauth-title" className="text-3xl md:text-4xl">
							Access Required
						</AppSectionTitle>
						<AppCopy className="max-w-prose text-balance">
							Please authenticate with your corporate account to continue.
						</AppCopy>
					</div>

					<div className="space-y-3">
						<AppButton
							type="button"
							onClick={() => login("google")}
							aria-label="Sign in with Google"
							disabled={!!redirecting || isLoading}
							variant="secondary"
							className="w-full justify-between"
						>
							<span className="inline-flex items-center gap-3">
								<img
									src="/chrome-filled-svgrepo-com.svg"
									alt=""
									aria-hidden="true"
									className="size-5 shrink-0"
								/>
								{redirecting === "google" || isLoading ? "Signing..." : "Continue with Google"}
							</span>
							<ArrowRight size={16} />
						</AppButton>

						<AppButton
							type="button"
							onClick={() => login("github")}
							aria-label="Sign in with GitHub"
							disabled={!!redirecting || isLoading}
							variant="secondary"
							className="w-full justify-between"
						>
							<span className="inline-flex items-center gap-3">
								<img
									src="/github-svgrepo-com.svg"
									alt=""
									aria-hidden="true"
									className="size-5 shrink-0"
								/>
								{redirecting === "github" || isLoading ? "Signing..." : "Continue with GitHub"}
							</span>
							<ArrowRight size={16} />
						</AppButton>
					</div>

					<AppCopy className="text-center text-xs">
						By continuing, you agree to our{" "}
						<a href="#/legal/terms" className="text-[var(--accent-primary)] underline-offset-4 hover:underline">Terms of Service</a>{" "}
						and{" "}
						<a href="#/legal/privacy" className="text-[var(--accent-primary)] underline-offset-4 hover:underline">Privacy Policy</a>.
					</AppCopy>
				</AppPanel>
			</motion.div>
		</AppPage>
	);
}
