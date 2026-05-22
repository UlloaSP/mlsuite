/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AUTH_COPY, PASSWORD_MIN_LENGTH, type AuthMode } from "./authLandingCopy";
import { AuthField } from "./AuthField";

export function FormSentence({ mode, disabled }: { mode: AuthMode; disabled: boolean }) {
  return (
    <p className="flex flex-col gap-2 text-xl font-normal leading-[1.7] tracking-[-0.3px] sm:block xl:text-[28px] 2xl:text-[32px]">
      {mode === "register" && (
        <>
          Hi, I&apos;m{" "}
          <AuthField
            required
            disabled={disabled}
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="my name"
            className="sm:min-w-[170px] xl:min-w-[230px] 2xl:min-w-[260px]"
          />
          . You can reach me at{" "}
        </>
      )}
      {mode === "login" && <>I&apos;m </>}
      <AuthField
        required
        disabled={disabled}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={AUTH_COPY[mode].emailPlaceholder}
        className="sm:min-w-[200px] xl:min-w-[280px] 2xl:min-w-[320px]"
      />
      {mode === "login" ? " and my password is " : " and I'd like my password to be "}
      <AuthField
        required
        disabled={disabled}
        label="Password"
        name="password"
        type="password"
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete={AUTH_COPY[mode].passwordAutoComplete}
        placeholder="••••••"
        className="tracking-[4px] sm:min-w-[190px] 2xl:min-w-[220px]"
      />
      .
    </p>
  );
}
