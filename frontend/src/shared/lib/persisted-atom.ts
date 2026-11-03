/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createAtom, type Atom } from "@tanstack/react-store";

const browserStorage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * An atom kept as JSON in localStorage under `key`. It starts from the stored value, falls back to
 * `initialValue` when that is absent, unreadable, or rejected by `isValid`, writes every value it
 * is set to, and follows changes other tabs make to the same key.
 */
export function createPersistedAtom<T>(
  key: string,
  initialValue: T,
  isValid?: (value: unknown) => value is T,
): Atom<T> {
  const parse = (text: string | null | undefined): T => {
    if (!text) return initialValue;
    try {
      const value: unknown = JSON.parse(text);
      return !isValid || isValid(value) ? (value as T) : initialValue;
    } catch {
      return initialValue;
    }
  };
  const read = () => {
    try {
      return parse(browserStorage()?.getItem(key));
    } catch {
      return initialValue;
    }
  };

  const atom = createAtom<T>(read());
  const set: Atom<T>["set"] = (update: T | ((previous: T) => T)) => {
    const value =
      typeof update === "function" ? (update as (previous: T) => T)(atom.get()) : update;
    atom.set(() => value);
    try {
      browserStorage()?.setItem(key, JSON.stringify(value));
    } catch {
      // Blocked or full storage keeps the value for this page only.
    }
  };

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event) => {
      const storage = browserStorage();
      if (storage && event.storageArea === storage && event.key === key) {
        atom.set(() => parse(event.newValue));
      }
    });
  }

  return { get: atom.get, subscribe: atom.subscribe, set };
}
