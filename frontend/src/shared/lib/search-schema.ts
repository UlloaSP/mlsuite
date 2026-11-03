/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";

/*
 * Search params arrive as plain strings (see app/router/search-params.ts). A param that is absent
 * or names nothing the page knows reads as its fallback, and the router leaves the fallback out
 * of the URL.
 */

/** One of `values`, or `fallback`. */
export const choiceParam = <const T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
) => z.enum(values).default(fallback).catch(fallback);

/** Free text, or `fallback`. */
export const textParam = (fallback = "") => z.string().default(fallback).catch(fallback);

/** Free text with no fallback: absent stays absent. */
export const optionalTextParam = () => z.string().optional().catch(undefined);

/** A catalog's typed search, its filter and its sort, each with the catalog's fallback. */
export const catalogSearch = <
  const TFilter extends readonly [string, ...string[]],
  const TSort extends readonly [string, ...string[]],
>(
  filters: TFilter,
  filter: TFilter[number],
  sorts: TSort,
  sort: TSort[number],
) => ({ q: textParam(), filter: choiceParam(filters, filter), sort: choiceParam(sorts, sort) });
