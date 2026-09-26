/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function AuthWordmark({ suffix = "" }: { suffix?: string }) {
  return (
    <span className="auth-wordmark">
      <span className="auth-wordmark-ml">ML</span>
      <span className="auth-wordmark-suite">suite{suffix}</span>
    </span>
  );
}
