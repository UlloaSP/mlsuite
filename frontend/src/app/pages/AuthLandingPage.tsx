/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { useState } from "react";
import { useLogin, useRegister } from "../../user/hooks";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHeader } from "./auth-landing/AuthHeader";
import { AuthHero } from "./auth-landing/AuthHero";
import { AuthOptions } from "./auth-landing/AuthOptions";
import type { AuthMode } from "./auth-landing/authLandingCopy";

export function AuthLandingPage() {
	const [mode, setMode] = useState<AuthMode | null>(null);
	const login = useLogin();
	const register = useRegister();
	const busy = login.isPending || register.isPending;

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (mode === null || busy) return;

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "");
		const password = String(formData.get("password") ?? "");

		if (mode === "login") {
			login.mutate({ email, password });
			return;
		}

		register.mutate({
			email,
			password,
			fullName: String(formData.get("fullName") ?? ""),
		});
	};

	return (
		<div className="min-h-svh overflow-x-hidden bg-[#fdfcf8] font-sans text-[#111] transition-colors">
			<div className="relative flex min-h-svh w-full flex-col overflow-x-hidden">
				<AuthHeader />

				<section
					className="relative z-10 flex flex-1 flex-col gap-9 px-5 py-8 sm:px-7 sm:py-10 lg:flex-row lg:items-end lg:gap-0 lg:px-[44px] lg:pb-[48px] lg:pt-0"
					aria-labelledby="auth-title"
				>
					<AuthHero />
					<aside
						className="flex w-full flex-col lg:flex-1 lg:self-stretch lg:pl-[44px]"
						aria-label="Authentication"
					>
						<div className="w-full max-w-[620px] lg:mt-auto lg:max-w-none">
							{mode === null ? (
								<AuthOptions onSelect={setMode} />
							) : (
								<AuthFormPanel
									mode={mode}
									busy={busy}
									onModeChange={setMode}
									onSubmit={submit}
								/>
							)}
						</div>
					</aside>
				</section>
			</div>
		</div>
	);
}
