/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { useAtom } from "jotai";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import type { LoginPayload, RegisterPayload } from "@/capabilities/workspace-context/session-api";
import { safeReturnTo, useLogin, useRegister } from "@/capabilities/workspace-context/session";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHeader } from "./auth-landing/AuthHeader";
import { AuthHero } from "./auth-landing/AuthHero";
import { AuthRelief } from "./auth-landing/AuthRelief";
import { AuthTrace } from "./auth-landing/AuthTrace";
import type { AuthMode } from "./auth-landing/authLandingCopy";

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

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
    const email = readFormValue(formData, "email");
    const password = readFormValue(formData, "password");

    if (mode === "login") {
      const request: LoginPayload = { email, password };
      login.mutate(request);
      return;
    }

    const request: RegisterPayload = {
      email,
      password,
      fullName: readFormValue(formData, "fullName"),
    };
    register.mutate(request);
  };

  return (
    <div
      className={`min-h-dvh bg-[var(--page-bg)] text-[var(--text-primary)] ${theme === "dark" ? "dark" : ""}`}
    >
      <main className="relative isolate grid min-h-dvh w-full overflow-hidden bg-[var(--surface-secondary)] lg:grid-cols-[minmax(0,7fr)_minmax(28rem,5fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        <AuthRelief mode={mode} />
        <AuthHeader />

        <section
          className="relative z-10 order-2 flex min-h-[19rem] border-b border-[var(--border-soft)] px-5 py-10 sm:min-h-[22rem] sm:px-8 sm:py-14 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16 xl:py-[clamp(2rem,6dvh,4rem)]"
          aria-labelledby="auth-title"
        >
          <AuthHero />
        </section>

        <section
          className="relative z-10 order-1 flex items-start overflow-y-auto border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-primary)_90%,transparent)] px-5 py-12 sm:px-8 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:min-h-0 lg:border-b-0 lg:px-12 lg:py-12 xl:px-16"
          aria-label="Authentication"
        >
          <AuthFormPanel
            mode={mode}
            busy={busy}
            error={submitError}
            onModeChange={setMode}
            onSubmit={submit}
          />
        </section>

        <section className="relative z-10 order-3 hidden lg:col-start-1 lg:row-start-3 lg:block lg:border-r lg:border-[var(--border-soft)]">
          <AuthTrace />
        </section>
      </main>
    </div>
  );
}
