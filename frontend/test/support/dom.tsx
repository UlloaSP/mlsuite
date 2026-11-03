import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/use-debounced-value";
import { catalogViewport } from "./catalog-viewport";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRoute,
} from "@tanstack/react-router";
import { act, createContext, useContext, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { routeTree } from "@/app/router/routes";
import { parseSearch, stringifySearch } from "@/app/router/search-params";
import { afterEach, beforeEach, vi } from "vite-plus/test";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export type MountOptions = {
  /** Wraps the tree in a memory router starting at this entry. */
  route?: string;
  /**
   * The pages that router matches, by path (`/review/$reviewId`); the mounted tree stays
   * rendered around them. Without pages, every address shows the tree alone. The router has the
   * app's routes (ids, paths, search validation) without their pages, guards or loaders, so a
   * component reads its route's typed params and search as in the app.
   */
  routes?: Record<string, ReactNode>;
  /** Wraps the tree in a QueryClientProvider for this client. */
  queryClient?: QueryClient;
};

export type Mounted = {
  host: HTMLDivElement;
  root: Root;
  rerender: (ui: ReactNode) => Promise<void>;
  unmount: () => Promise<void>;
};

const mounted = new Set<Mounted>();
const clients = new Set<QueryClient>();
beforeEach(() => {
  if (typeof HTMLElement !== "undefined") catalogViewport();
});

afterEach(() => {
  for (const view of mounted) act(() => view.root.unmount());
  mounted.clear();
  for (const client of clients) client.clear();
  clients.clear();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const MountedTree = createContext<ReactNode>(null);

function TestRoot() {
  return (
    <>
      {useContext(MountedTree)}
      <Outlet />
    </>
  );
}

const joinPath = (parent: string, path: string | undefined) =>
  path === undefined ? parent : `${parent.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

/** The app's routes under `parent`, each showing the page `routes` names for its path, if any. */
const appRoutes = (
  source: AnyRoute,
  parent: AnyRoute,
  parentPath: string,
  routes: Record<string, ReactNode>,
  seen: Set<string>,
): AnyRoute[] =>
  ((source.children ?? []) as AnyRoute[]).map((child) => {
    const { id, path, validateSearch, search } = child.options as {
      id?: string;
      path?: string;
      validateSearch?: never;
      search?: never;
    };
    const fullPath = joinPath(parentPath, path);
    const children = (child.children ?? []) as AnyRoute[];
    if (children.length === 0) seen.add(fullPath);
    const route = createRoute({
      getParentRoute: () => parent,
      ...(id ? { id } : { path: path! }),
      validateSearch,
      search,
      component: children.length > 0 ? Outlet : () => routes[fullPath] ?? routes.$ ?? null,
    });
    return children.length > 0
      ? route.addChildren(appRoutes(child, route, fullPath, routes, seen))
      : route;
  });

/** A memory router at `route` whose root renders the mounted tree around the matched page. */
export function createTestRouter(route: string, routes: Record<string, ReactNode> = {}) {
  const root = createRootRoute({ component: TestRoot });
  const seen = new Set<string>();
  const app = appRoutes(routeTree, root, "", routes, seen);
  // Any other address shows the mounted tree alone; pages a test invents match as written.
  const extra = Object.entries({ $: null, ...routes })
    .filter(([path]) => !seen.has(path))
    .map(([path, element]) =>
      createRoute({ getParentRoute: () => root, path, component: () => element }),
    );
  return createRouter({
    routeTree: root.addChildren([...app, ...extra]),
    history: createMemoryHistory({ initialEntries: [route] }),
    parseSearch,
    stringifySearch,
  });
}

const routers = new WeakMap<MountOptions, ReturnType<typeof createTestRouter>>();

const wrap = (ui: ReactNode, options: MountOptions): ReactNode => {
  const { route, routes, queryClient } = options;
  let routed = ui;
  if (route !== undefined) {
    const router = routers.get(options) ?? createTestRouter(route, routes);
    routers.set(options, router);
    routed = (
      <MountedTree.Provider value={ui}>
        <RouterProvider router={router} />
      </MountedTree.Provider>
    );
  }
  return queryClient ? (
    <QueryClientProvider client={queryClient}>{routed}</QueryClientProvider>
  ) : (
    routed
  );
};

/** Renders into a fresh host on the body; the view is unmounted after each test. */
export async function mount(ui: ReactNode, options: MountOptions = {}): Promise<Mounted> {
  if (!options.queryClient) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.add(client);
    options = { ...options, queryClient: client };
  }
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const view: Mounted = {
    host,
    root: { render: (next) => root.render(wrap(next, options)), unmount: () => root.unmount() },
    rerender: (next) => act(async () => root.render(wrap(next, options))),
    unmount: async () => {
      mounted.delete(view);
      await act(async () => root.unmount());
      host.remove();
    },
  };
  mounted.add(view);
  await view.rerender(ui);
  return view;
}

/** Finds the button whose trimmed text is exactly `text`. */
export const buttonByText = (text: string, scope: ParentNode = document.body) =>
  [...scope.querySelectorAll("button")].find((node) => node.textContent?.trim() === text);

/** Clicks an element, or the button whose trimmed text is exactly `target`, inside act. */
export async function click(target: string | Element, scope: ParentNode = document.body) {
  const element = typeof target === "string" ? buttonByText(target, scope) : target;
  if (!element) throw new Error(`No button labelled "${target as string}"`);
  await act(async () => (element as HTMLElement).click());
}

/** Sets a controlled input's value through the native setter so React sees the change. */
export async function changeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement | HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Typed searches reach the server after a short pause; this waits it out. */
export const searchDelay = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 20)));
