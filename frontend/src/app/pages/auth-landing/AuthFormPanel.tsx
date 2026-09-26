/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useId, type FormEvent } from "react";
import { AUTH_COPY, PASSWORD_MIN_LENGTH, type AuthMode } from "./authLandingCopy";
import { AuthField } from "./AuthField";

export function AuthFormPanel({
  mode,
  locked,
  failed,
  onModeChange,
  onSubmit,
}: {
  mode: AuthMode;
  locked: boolean;
  failed: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const copy = AUTH_COPY[mode];
  const errorId = useId();
  const field = { required: true, readOnly: locked, invalid: failed, errorId };
  const error = failed ? (
    <p
      id={errorId}
      role="alert"
      className="mt-1 text-[13px] leading-[18px] text-[var(--danger-text)]"
    >
      {copy.error}
    </p>
  ) : null;

  return (
    <form className="auth-glass" aria-busy={locked} onSubmit={onSubmit}>
      <div aria-hidden="true" className="auth-perforation" />
      <div className="flex flex-1 flex-col justify-between">
        {mode === "login" ? (
          <div className="flex flex-col gap-4">
            <AuthField
              {...field}
              label="EMAIL"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
            />
            <AuthField
              {...field}
              label="PASSWORD"
              name="password"
              type="password"
              autoComplete={copy.passwordAutoComplete}
              placeholder="••••••••••••"
            />
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AuthField {...field} name="fullName" autoComplete="name" placeholder="Full name" />
            <AuthField
              {...field}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
            />
            <AuthField
              {...field}
              name="password"
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
            {locked ? (
              <span aria-label={copy.submit}>✓</span>
            ) : (
              <>
                {copy.submit}
                <span aria-hidden="true">&nbsp;&nbsp;→</span>
              </>
            )}
          </button>
          <div className="flex justify-center gap-1.5 text-sm text-[var(--text-secondary)]">
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
