/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import { AUTH_COPY, type AuthMode } from "./authLandingCopy";
import { FormSentence } from "./FormSentence";

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
  return (
    <div>
      <p className="mb-[22px] text-[10px] uppercase tracking-[0.14em] text-[#999] [font-family:'DM_Mono',monospace] dark:text-[#8d97a3] xl:mb-7 xl:text-[11px]">
        {AUTH_COPY[mode].tab}
      </p>

      <form onSubmit={onSubmit}>
        <FormSentence mode={mode} disabled={busy} />

        <div className="mt-6 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center xl:mt-8 xl:gap-[18px]">
          <button
            type="submit"
            disabled={busy}
            className="bg-[#111] px-[22px] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#ff385c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f5f5f5] dark:text-[#101418] dark:hover:bg-[#ff385c] dark:hover:text-white xl:px-7 xl:py-[13px] xl:text-base"
          >
            {AUTH_COPY[mode].submit}
          </button>
          <button
            type="button"
            onClick={() => onModeChange(mode === "login" ? "register" : "login")}
            className="bg-transparent p-0 text-left text-[11px] text-[#999] transition [font-family:'DM_Mono',monospace] hover:text-[#ff385c] dark:text-[#8d97a3] sm:text-center xl:text-[13px]"
          >
            {AUTH_COPY[mode].switch}
          </button>
        </div>

        {error ? (
          <p className="mt-3.5 text-[11px] font-semibold text-[#c13515] dark:text-[#fda4af]">
            {mode === "login" ? "Sign in failed." : "Account creation failed."}
          </p>
        ) : null}
        <p className="mt-3.5 text-[10px] tracking-[0.06em] text-[#bbb] [font-family:'DM_Mono',monospace] xl:mt-[18px] xl:text-[11px]">
          {AUTH_COPY[mode].foot}
        </p>
      </form>
    </div>
  );
}
