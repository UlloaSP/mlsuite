/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Lock, Mail, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import type { FormEvent } from "react";
import { useState } from "react";
import {
	AppButton,
	AppCopy,
	AppPage,
	AppPanel,
	AppTabs,
	AppTextField,
	AppTitle,
} from "../components";
import { useLogin, useRegister, useUser } from "../../user/hooks";

type Mode = "login" | "register";

export function Unauthorized() {
	const [mode, setMode] = useState<Mode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const login = useLogin();
	const register = useRegister();
	const { isLoading } = useUser();
	const busy = login.isPending || register.isPending || isLoading;

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (mode === "login") {
			login.mutate({ email, password });
			return;
		}
		register.mutate({ email, password, fullName, username: username || undefined });
	};

	return (
		<AppPage className="min-h-dvh bg-[#fdfcf8] text-[#222]">
			<motion.main
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="grid min-h-dvh flex-1 gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12"
			>
				<section className="flex min-h-[360px] flex-col justify-between border-b border-black/10 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
					<div className="flex items-center gap-3">
						<div className="grid size-11 place-items-center rounded-[14px] bg-[#ff385c] text-white">
							<Lock size={20} />
						</div>
						<span className="text-3xl font-bold tracking-[-0.04em]">MLSuite</span>
					</div>
					<div>
						<p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff385c]">
							Manual Access
						</p>
						<AppTitle className="max-w-[760px] text-[4.4rem] leading-[0.9] lg:text-[5.6rem]">
							Sign in to your model workspace.
						</AppTitle>
						<AppCopy className="mt-5 max-w-2xl">
							Use your MLSuite account. Workspace permissions are enforced by the tenant RBAC model after authentication.
						</AppCopy>
					</div>
				</section>
				<section className="flex items-center">
					<AppPanel className="w-full rounded-[24px] bg-white p-6">
						<AppTabs
							value={mode}
							onChange={setMode}
							items={[
								{ label: "Login", value: "login" },
								{ label: "Create account", value: "register" },
							]}
						/>
						<form onSubmit={submit} className="mt-6 space-y-4">
							{mode === "register" ? (
								<>
									<AppTextField
										required
										value={fullName}
										onChange={(event) => setFullName(event.target.value)}
										placeholder="Full name"
										prefix={<UserPlus size={16} />}
										className="w-full"
									/>
									<AppTextField
										value={username}
										onChange={(event) => setUsername(event.target.value)}
										placeholder="Username"
										className="w-full"
									/>
								</>
							) : null}
							<AppTextField
								required
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="Email"
								prefix={<Mail size={16} />}
								className="w-full"
							/>
							<AppTextField
								required
								type="password"
								minLength={10}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								placeholder="Password"
								prefix={<Lock size={16} />}
								className="w-full"
							/>
							<AppButton type="submit" disabled={busy} className="w-full">
								{busy ? "Working..." : mode === "login" ? "Login" : "Create account"}
							</AppButton>
						</form>
					</AppPanel>
				</section>
			</motion.main>
		</AppPage>
	);
}
