/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { useAtom } from "jotai";
import { useState } from "react";
import { themeWithHtmlAtom } from "../atoms";
import type { LoginPayload, RegisterPayload } from "../../user/api/userService";
import { useLogin, useRegister } from "../../user/hooks";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHeader } from "./auth-landing/AuthHeader";
import { AuthHero } from "./auth-landing/AuthHero";
import { AuthOptions } from "./auth-landing/AuthOptions";
import type { AuthMode } from "./auth-landing/authLandingCopy";

const DEFAULT_AUTH_MODES = ["login", "register"] as const satisfies readonly AuthMode[];

type AuthLandingPageProps = {
  defaultMode?: AuthMode | null;
  availableModes?: readonly AuthMode[];
  onLogin?: (request: LoginPayload) => void;
  onRegister?: (request: RegisterPayload) => void;
  loginBusy?: boolean;
  registerBusy?: boolean;
  loginError?: unknown;
  registerError?: unknown;
};

export function AuthLandingPage({
  defaultMode = null,
  availableModes = DEFAULT_AUTH_MODES,
  onLogin,
  onRegister,
  loginBusy,
  registerBusy,
  loginError,
  registerError,
}: AuthLandingPageProps = {}) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [selectedMode, setSelectedMode] = useState<AuthMode | null>(null);
  const mode = selectedMode ?? defaultMode;
  const login = useLogin();
  const register = useRegister();
  const busy = (loginBusy ?? login.isPending) || (registerBusy ?? register.isPending);
  const submitError =
    mode === "login" ? (loginError ?? login.error) : (registerError ?? register.error);
  const enabledModes = availableModes.length > 0 ? availableModes : DEFAULT_AUTH_MODES;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === null || busy) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (mode === "login") {
      const request: LoginPayload = { email, password };
      if (onLogin) {
        onLogin(request);
        return;
      }
      login.mutate(request);
      return;
    }

    const request: RegisterPayload = {
      email,
      password,
      fullName: String(formData.get("fullName") ?? ""),
    };
    if (onRegister) {
      onRegister(request);
      return;
    }
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
              {mode === null ? (
                <AuthOptions modes={enabledModes} onSelect={setSelectedMode} />
              ) : (
                <AuthFormPanel
                  mode={mode}
                  modes={enabledModes}
                  busy={busy}
                  error={submitError}
                  onModeChange={setSelectedMode}
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
