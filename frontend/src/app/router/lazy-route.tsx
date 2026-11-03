/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import {
  createRoute,
  lazyRouteComponent,
  stripSearchParams,
  type AnyRoute,
  type ResolveParams,
} from "@tanstack/react-router";
import type { ComponentType } from "react";
import type { z } from "zod";

/** What a page's loader reads: the cache to fill, and the page's params and search. */
type PageLoader<TPath extends string, TSearch> = (input: {
  queryClient: QueryClient;
  params: ResolveParams<TPath>;
  search: TSearch;
}) => Promise<unknown>;

const lazyPage = (load: () => Promise<ComponentType>) =>
  lazyRouteComponent(() => load().then((Component) => ({ default: Component })));

const queryClientOf = (context: unknown) => (context as { queryClient: QueryClient }).queryClient;

/*
 * Routes are made here, in generic functions, rather than with createRoute() where the tree is
 * declared: a page imported in place would make the tree's type depend on the page's module,
 * whose links depend on the registered tree again, and every typed address would become `any`.
 */

/**
 * A lazily loaded page under `parent`; keep `load` a literal `import()` so each page gets its own
 * chunk. The router loads the chunk while `loader`, if any, starts reading the page's data.
 */
export const page = <TParent extends AnyRoute, const TPath extends string>(
  parent: TParent,
  path: TPath,
  load: () => Promise<ComponentType>,
  loader?: PageLoader<TPath, Record<string, never>>,
) =>
  createRoute({
    getParentRoute: () => parent,
    path,
    component: lazyPage(load),
    loader: loader
      ? ({ context, params }) =>
          loader({
            queryClient: queryClientOf(context),
            params: params as ResolveParams<TPath>,
            search: {},
          })
      : undefined,
  });

/**
 * A page as `page()` makes it that owns search params: `schema` validates them, each with its
 * fallback (see shared/lib/search-schema.ts), and links leave every fallback out of the URL.
 * Search params are plain strings in the URL (see search-params.ts).
 */
export const searchPage = <
  TParent extends AnyRoute,
  const TPath extends string,
  TSchema extends z.ZodObject,
>(
  parent: TParent,
  path: TPath,
  schema: TSchema,
  load: () => Promise<ComponentType>,
  loader?: PageLoader<TPath, z.output<TSchema>>,
) =>
  createRoute({
    getParentRoute: () => parent,
    path,
    component: lazyPage(load),
    validateSearch: schema,
    search: {
      // The fallbacks are what an empty search parses to.
      middlewares: [stripSearchParams(schema.parse({}) as never)],
    },
    // Only a page that loads data depends on its search for loading.
    loaderDeps: ({ search }) => ({ search: loader ? (search as z.output<TSchema>) : undefined }),
    loader: loader
      ? ({ context, params, deps }) =>
          loader({
            queryClient: queryClientOf(context),
            params: params as ResolveParams<TPath>,
            search: deps.search!,
          })
      : undefined,
  });
