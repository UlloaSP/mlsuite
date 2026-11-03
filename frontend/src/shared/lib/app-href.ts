/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * An address inside the app known only at runtime (a return-to address, a remembered location,
 * a link the server sent), as link options: its path, plain search params, and hash. Addresses
 * written in code use the route's typed `to` and `params` instead.
 */
export const appHref = (href: string) => {
  const url = new URL(href, "https://app.invalid");
  return {
    to: decodeURI(url.pathname),
    search: Object.fromEntries(url.searchParams),
    hash: url.hash.slice(1) || undefined,
  };
};
