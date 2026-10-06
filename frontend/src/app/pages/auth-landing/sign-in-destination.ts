/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { safeReturnTo } from "@/capabilities/workspace-context/session";
import type { AuthMode } from "./authLandingCopy";

/**
 * Where a successful sign-in or registration goes: back to the page that sent the
 * visitor here (an expired session, a public page's header); otherwise signing in
 * greets the member with where they left off, and a new account (with nothing to
 * resume) goes home.
 */
export const signInDestination = (mode: AuthMode, returnTo: string | null) =>
  safeReturnTo(returnTo, mode === "login" ? "/welcome" : "/home");
