/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const fullscreenAtom = atom(false);
export const globalSearchOpenAtom = atom(false);
export const sidebarCollapsedAtom = atomWithStorage<boolean>("ui/sidebar-collapsed", false);
