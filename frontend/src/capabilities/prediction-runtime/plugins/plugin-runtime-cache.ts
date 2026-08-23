/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const scopes = new Map<string, Map<string, Promise<unknown>>>();

export const memoizeCompiledPlugin = <T>(
  organizationId: number | string,
  key: string,
  load: () => Promise<T>,
): Promise<T> => {
  const scope = String(organizationId);
  let cache = scopes.get(scope);
  if (!cache) {
    cache = new Map();
    scopes.set(scope, cache);
  }
  let value = cache.get(key) as Promise<T> | undefined;
  if (!value) {
    value = load();
    cache.set(key, value);
    void value.catch(() => cache?.delete(key));
  }
  return value;
};

export const invalidatePluginRuntimeCache = (organizationId?: number | string): void => {
  if (organizationId === undefined) scopes.clear();
  else scopes.delete(String(organizationId));
};
