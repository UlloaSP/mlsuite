/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useId, type FormEvent } from "react";
import { AUTH_COPY, PASSWORD_MIN_LENGTH, type AuthMode } from "./authLandingCopy";
import { AuthField } from "./AuthField";

/** What went wrong with the last attempt, and which field it is about: one, all, or none. */
export type AuthFailure = { message: string; field: string | "all" | null };

export function AuthFormPanel({
  mode,
  pending,
  succeeded,
  failure,
  onModeChange,
  onSubmit,
}: {
  mode: AuthMode;
  /** The server has the attempt and has not answered yet. */
  pending: boolean;
  /** The server accepted the attempt; the welcome is playing. */
  succeeded: boolean;
  failure: AuthFailure | null;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const copy = AUTH_COPY[mode];
  const errorId = useId();
  const locked = pending || succeeded;
  const field = (name: string) => ({
    name,
    required: true,
    readOnly: locked,
    invalid: failure !== null && (failure.field === "all" || failure.field === name),
    errorId,
  });
  const error = failure ? (
    <p id={errorId} role="alert" className="mt-1 text-sm leading-[18px] text-danger-fg">
      {failure.message}
    </p>
  ) : null;

  return (
    <form className="auth-glass" aria-busy={locked} noValidate onSubmit={onSubmit}>
      <div aria-hidden="true" className="auth-perforation" />
      <div className="flex flex-1 flex-col justify-between">
        {mode === "login" ? (
          <div className="flex flex-col gap-4">
            <AuthField
              {...field("email")}
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
            />
            <AuthField
              {...field("password")}
              label="Password"
              type="password"
              autoComplete={copy.passwordAutoComplete}
              placeholder="••••••••••••"
            />
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* The pass has a fixed height: two names share a row so it keeps room for an error. */}
            <div className="grid grid-cols-2 gap-2.5">
              <AuthField {...field("fullName")} autoComplete="name" placeholder="Full name" />
              <AuthField
                {...field("username")}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Username"
              />
            </div>
            <AuthField {...field("email")} type="email" autoComplete="email" placeholder="Email" />
            <AuthField
              {...field("password")}
              type="password"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete={copy.passwordAutoComplete}
              placeholder="Password"
            />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          <button type="submit" disabled={locked} className="auth-submit">
            {succeeded ? (
              <span aria-label={copy.submit}>✓</span>
            ) : pending ? (
              copy.pending
            ) : (
              <>
                {copy.submit}
                <span aria-hidden="true">&nbsp;&nbsp;→</span>
              </>
            )}
          </button>
          <div className="flex justify-center gap-1.5 text-sm text-fg-secondary">
            {copy.switchPrompt}
            <button
              type="button"
              disabled={locked}
              onClick={() => onModeChange(mode === "login" ? "register" : "login")}
              className="auth-link"
            >
              {copy.switchAction}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
