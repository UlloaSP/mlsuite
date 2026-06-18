/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useUser } from "../../user/hooks";

export function useCurrentUserIsSuperadmin() {
  return useUser().data?.systemRole === "SUPERADMIN";
}
