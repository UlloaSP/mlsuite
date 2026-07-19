/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useUser } from "@/api/user/hooks";

export function useCurrentUserIsSuperadmin() {
  return useUser().data?.systemRole === "SUPERADMIN";
}
