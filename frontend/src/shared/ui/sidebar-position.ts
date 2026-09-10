/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atomWithStorage } from "jotai/utils";

export type SidebarPosition = "left" | "right";

const STORAGE_KEY = "ui/sidebar-position";
const DEFAULT_POSITION: SidebarPosition = "right";

const isSidebarPosition = (value: unknown): value is SidebarPosition =>
  value === "left" || value === "right";

const sidebarPositionStorage = {
  getItem: (key: string, initialValue: SidebarPosition) => {
    const raw = localStorage.getItem(key);
    if (!raw) return initialValue;

    try {
      const value: unknown = JSON.parse(raw);
      return isSidebarPosition(value) ? value : initialValue;
    } catch {
      return isSidebarPosition(raw) ? raw : initialValue;
    }
  },
  setItem: (key: string, value: SidebarPosition) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

export const sidebarPositionAtom = atomWithStorage<SidebarPosition>(
  STORAGE_KEY,
  DEFAULT_POSITION,
  sidebarPositionStorage,
  { getOnInit: true },
);
