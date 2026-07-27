/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { useAtom } from "jotai";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import type { LoginPayload, RegisterPayload } from "@/capabilities/workspace-context/session-api";
import { safeReturnTo, useLogin, useRegister } from "@/capabilities/workspace-context/session";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHeader } from "./auth-landing/AuthHeader";
import { AuthHero } from "./auth-landing/AuthHero";
import type { AuthMode } from "./auth-landing/authLandingCopy";

export function AuthLandingPage() {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [searchParams] = useSearchParams();
  const destination = safeReturnTo(searchParams.get("returnTo"));
  const [mode, setMode] = useState<AuthMode>("login");
  const login = useLogin(destination);
  const register = useRegister(destination);
  const busy = mode === "login" ? login.isPending : register.isPending;
  const submitError = mode === "login" ? login.error : register.error;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (mode === "login") {
      const request: LoginPayload = { email, password };
      login.mutate(request);
      return;
    }

    const request: RegisterPayload = {
      email,
      password,
      fullName: String(formData.get("fullName") ?? ""),
    };
    register.mutate(request);
  };

  return (
    <div
      className={`min-h-svh overflow-x-hidden bg-[#fdfcf8] text-[#111] transition-colors [font-family:'Space_Grotesk',sans-serif] dark:bg-[#101418] dark:text-[#f5f5f5] ${theme === "dark" ? "dark" : ""}`}
    >
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
              <AuthFormPanel
                mode={mode}
                busy={busy}
                error={submitError}
                onModeChange={setMode}
                onSubmit={submit}
              />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
