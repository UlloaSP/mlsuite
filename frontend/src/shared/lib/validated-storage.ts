/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createJSONStorage } from "jotai/utils";

type SyncStorage<T> = {
  getItem: (key: string, initialValue: T) => T;
  setItem: (key: string, value: T) => void;
  removeItem: (key: string) => void;
  subscribe?: (key: string, callback: (value: T) => void, initialValue: T) => () => void;
};

/** JSON localStorage for `atomWithStorage` that falls back to the default for invalid values. */
export const validatedStorage = <T>(isValid: (value: unknown) => value is T): SyncStorage<T> => {
  const storage = createJSONStorage<unknown>();
  const valid = (value: unknown, initialValue: T) => (isValid(value) ? value : initialValue);
  return {
    getItem: (key, initialValue) => valid(storage.getItem(key, initialValue), initialValue),
    setItem: storage.setItem,
    removeItem: storage.removeItem,
    subscribe: (key, callback, initialValue) =>
      storage.subscribe?.(key, (value) => callback(valid(value, initialValue)), initialValue) ??
      (() => undefined),
  };
};
