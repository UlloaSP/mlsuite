/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createAtom } from "@tanstack/react-store";
import { createPersistedAtom } from "@/shared/lib/persisted-atom";

export const fullscreenAtom = createAtom(false);
export const globalSearchOpenAtom = createAtom(false);
export const sidebarCollapsedAtom = createPersistedAtom<boolean>("ui/sidebar-collapsed", false);
