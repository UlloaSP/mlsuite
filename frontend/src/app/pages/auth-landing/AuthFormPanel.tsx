/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { AUTH_COPY, PASSWORD_MIN_LENGTH, type AuthMode } from "./authLandingCopy";
import { AuthField } from "./AuthField";

export function AuthFormPanel({
  mode,
  busy,
  error,
  onModeChange,
  onSubmit,
}: {
  mode: AuthMode;
  busy: boolean;
  error?: unknown;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const copy = AUTH_COPY[mode];

  return (
    <div className="mx-auto my-auto w-full max-w-md">
      <div className="mb-10">
        <h2
          aria-label={`${copy.titleLead} ${copy.titleEmphasis}`}
          className="text-[3.75rem] leading-[0.82] tracking-[-0.06em] text-[var(--text-primary)] sm:text-[4.5rem] xl:text-[5rem]"
        >
          <span aria-hidden="true" className="block font-light">
            {copy.titleLead}
          </span>
          <span aria-hidden="true" className="block font-extrabold">
            {copy.titleEmphasis}
          </span>
        </h2>
      </div>

      <form className="grid gap-6" onSubmit={onSubmit}>
        {mode === "register" ? (
          <AuthField
            required
            disabled={busy}
            marker="01"
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="Your name"
          />
        ) : null}
        <AuthField
          required
          disabled={busy}
          marker={mode === "register" ? "02" : "01"}
          label="Email"
          name="email"
          type="email"
          autoComplete={mode === "login" ? "username" : "email"}
          placeholder="you@company.com"
        />
        <AuthField
          required
          disabled={busy}
          marker={mode === "register" ? "03" : "02"}
          label="Password"
          name="password"
          type="password"
          minLength={mode === "register" ? PASSWORD_MIN_LENGTH : undefined}
          autoComplete={copy.passwordAutoComplete}
          placeholder={mode === "register" ? "At least 10 characters" : "Your password"}
        />

        {error ? (
          <p
            className="rounded bg-[var(--danger-quiet)] px-4 py-3 text-sm text-[var(--danger-text)]"
            role="alert"
          >
            {copy.error}
          </p>
        ) : null}

        <AppButton
          type="submit"
          disabled={busy}
          className="mt-2 h-14 w-full justify-between px-5 text-base font-semibold"
        >
          {busy ? copy.pending : copy.submit}
          {busy ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
              size={17}
            />
          ) : (
            <ArrowRight aria-hidden="true" size={17} />
          )}
        </AppButton>

        <div className="flex flex-wrap items-center gap-x-1 text-sm text-[var(--text-secondary)]">
          <span>{copy.switchPrompt}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onModeChange(mode === "login" ? "register" : "login")}
            className="rounded px-1 py-0.5 font-semibold text-[var(--accent-primary-strong)] outline-none transition hover:text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.switchAction}
          </button>
        </div>
      </form>
    </div>
  );
}
