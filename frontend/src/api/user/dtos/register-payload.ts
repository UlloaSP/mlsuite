/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LoginPayload } from "./index";

export type RegisterPayload = LoginPayload & {
  fullName: string;
  username?: string;
};
