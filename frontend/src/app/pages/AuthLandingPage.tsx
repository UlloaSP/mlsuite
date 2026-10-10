/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CSSProperties, FormEvent } from "react";
import { useAtom } from "jotai";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import { isPublicPage } from "@/app/router/public-routes";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import type { AuthRequest, LoginRequest } from "@/shared/api/openapi.gen";
import {
  AUTH_MODE_PARAM,
  safeReturnTo,
  useLogin,
  useRegister,
} from "@/capabilities/workspace-context/session";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AuthAccessOverlay } from "./auth-landing/AuthAccessOverlay";
import { AuthFormPanel } from "./auth-landing/AuthFormPanel";
import { AuthHorizon } from "./auth-landing/AuthHorizon";
import { AuthPassStub } from "./auth-landing/AuthPassStub";
import { AuthTypeBands } from "./auth-landing/AuthTypeBands";
import { AUTH_MODES, type AuthMode } from "./auth-landing/authLandingCopy";
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
  // The form on screen is part of the address, so a link can open registration directly.
  const [mode, setMode] = useSearchParamState<AuthMode>(AUTH_MODE_PARAM, "login", AUTH_MODES);
  // Signing in or registering goes back to the page that sent the visitor here (an expired
  // session, a public page's header); with none to go back to, it opens the public feed.
  const destination = safeReturnTo(searchParams.get("returnTo"), EXPLORE_PATH);
  // Leaving without an account goes back too, when that page needs no session.
  const cameFromPublicPage = destination !== EXPLORE_PATH && isPublicPage(destination);
  const access = useAuthAccess(destination);
  const passRef = useRef<HTMLDivElement>(null);
  const scale = useAuthStageScale();
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
      const request: LoginRequest = { email, password };
      login.mutate(request, callbacks);
      return;
    }

    const request: AuthRequest = {
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
      {/* Nothing public needs an account, so the screen never traps a visitor. */}
      <Link to={cameFromPublicPage ? destination : EXPLORE_PATH} className="auth-exit">
        {cameFromPublicPage ? (
          <>
            <ArrowLeft aria-hidden="true" size={14} />
            Back without signing in
          </>
        ) : (
          <>
            Explore without signing in
            <ArrowRight aria-hidden="true" size={14} />
          </>
        )}
      </Link>

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
