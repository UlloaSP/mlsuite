/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CSSProperties, FormEvent } from "react";
import { useAtom } from "jotai";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import type { LoginPayload, RegisterPayload } from "@/capabilities/workspace-context/session-api";
import { safeReturnTo, useLogin, useRegister } from "@/capabilities/workspace-context/session";
import { AuthAccessOverlay } from "./auth-landing/AuthAccessOverlay";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHorizon } from "./auth-landing/AuthHorizon";
import { AuthPassStub } from "./auth-landing/AuthPassStub";
import { AuthTypeBands } from "./auth-landing/AuthTypeBands";
import type { AuthMode } from "./auth-landing/authLandingCopy";
import { useAuthAccess } from "./auth-landing/useAuthAccess";
import { useAuthStageScale } from "./auth-landing/useAuthStageScale";
import "./auth-landing/auth-landing.css";
import "./auth-landing/auth-pass.css";
import "./auth-landing/auth-access-overlay.css";

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function AuthLandingPage() {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [searchParams] = useSearchParams();
  const access = useAuthAccess(safeReturnTo(searchParams.get("returnTo")));
  const passRef = useRef<HTMLDivElement>(null);
  const scale = useAuthStageScale();
  const [mode, setMode] = useState<AuthMode>("login");
  const login = useLogin();
  const register = useRegister();
  const mutation = mode === "login" ? login : register;

  const changeMode = (next: AuthMode) => {
    login.reset();
    register.reset();
    setMode(next);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (access.phase !== 0) return;

    const formData = new FormData(event.currentTarget);
    const email = readFormValue(formData, "email");
    const password = readFormValue(formData, "password");
    const callbacks = { onSuccess: access.succeed, onError: access.fail };
    access.start(passRef.current);

    if (mode === "login") {
      const request: LoginPayload = { email, password };
      login.mutate(request, callbacks);
      return;
    }

    const request: RegisterPayload = {
      email,
      password,
      fullName: readFormValue(formData, "fullName"),
    };
    register.mutate(request, callbacks);
  };

  return (
    <main
      className={`auth-stage ${theme === "dark" ? "dark" : ""}`}
      aria-labelledby="auth-title"
      style={{ "--auth-scale": scale } as CSSProperties}
    >
      <AuthTypeBands />
      <AuthHorizon />

      <div ref={passRef} className="auth-pass" data-phase={access.phase}>
        <div className="auth-pass-top">
          <AuthPassStub mode={mode} />
        </div>
        <div className="auth-pass-bottom">
          <AuthFormPanel
            mode={mode}
            locked={access.phase !== 0}
            failed={mutation.isError && access.phase === 0}
            onModeChange={changeMode}
            onSubmit={submit}
          />
        </div>
      </div>

      <AuthAccessOverlay mode={mode} open={access.phase === 2} reveal={access.reveal} />
    </main>
  );
}
