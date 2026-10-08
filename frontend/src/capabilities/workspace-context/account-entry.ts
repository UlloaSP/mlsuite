/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createContext, useContext } from "react";

/** Where a visitor without a session signs in or registers, coming back to the page they are on. */
export type AccountEntry = { signInHref: string; registerHref: string };

/**
 * Provided by the frame of a visitor without a session and absent for a signed-in member,
 * so a public page can offer an account without asking which frame is around it. Reading
 * the session from inside such a page would instead probe it again on every mount.
 */
export const AccountEntryContext = createContext<AccountEntry | null>(null);

export const useAccountEntry = () => useContext(AccountEntryContext);
