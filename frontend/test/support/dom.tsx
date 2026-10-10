import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/use-debounced-value";
import { catalogViewport } from "./catalog-viewport";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, vi } from "vite-plus/test";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export type MountOptions = {
  /** Wraps the tree in a MemoryRouter starting at this entry. */
  route?: string;
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

const wrap = (ui: ReactNode, { route, queryClient }: MountOptions): ReactNode => {
  const routed =
    route === undefined ? ui : <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>;
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
