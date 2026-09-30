/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { safeReturnTo } from "@/capabilities/workspace-context/session";
import type { AuthMode } from "./authLandingCopy";

/**
 * Where a successful sign-in goes: an expired session returns to its page;
 * otherwise signing in greets the member with where they left off, and a new
 * account (with nothing to resume) goes home.
 */
export const signInDestination = (mode: AuthMode, returnTo: string | null) =>
  safeReturnTo(returnTo, mode === "login" ? "/welcome" : "/home");
