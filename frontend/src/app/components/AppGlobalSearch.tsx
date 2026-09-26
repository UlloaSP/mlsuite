import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { useNavigate } from "react-router";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { searchQueryOptions } from "@/features/search/api/search.queries";
import { SearchResultGroup } from "@/features/search/components/SearchResultGroup";
import { useDebouncedValue } from "@/features/search/lib/use-debounced-value";
import { globalSearchOpenAtom } from "@/shared/ui/ui-state";
import { AppCopy } from "@/shared/ui/AppCopy";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { matchesShortcut, shortcutBindingsAtom } from "@/shared/ui/shortcut-state";

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable);

type SearchState = { query: string; activeIndex: number };
type SearchAction = { type: "query"; value: string } | { type: "active"; value: number };

const searchReducer = (state: SearchState, action: SearchAction): SearchState => {
  switch (action.type) {
    case "query":
      return { query: action.value, activeIndex: 0 };
    case "active":
      return { ...state, activeIndex: action.value };
  }
};

export function AppGlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useAtom(globalSearchOpenAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const [{ query, activeIndex }, dispatch] = useReducer(searchReducer, {
    query: "",
    activeIndex: 0,
  });
  const debouncedQuery = useDebouncedValue(query);
  const organizationId = useCurrentOrganizationId();
  const { data, isFetching } = useQuery(searchQueryOptions(organizationId, debouncedQuery));

  const flatResults = useMemo(
    () => (data?.groups ?? []).flatMap((group) => group.results),
    [data?.groups],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, bindings["global-search"]) && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings, setOpen]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const showPanel = query.trim().length >= 2 || isFetching;
  let offset = 0;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-overlay backdrop-blur-sm transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          aria-label="Global search"
          className={cx(
            FOCUS_RING,
            "fixed left-1/2 top-[14vh] z-(--z-modal) w-[min(47rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-dialog border border-line bg-surface shadow-hover outline-none transition duration-150",
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
          )}
        >
          <label className="sr-only" htmlFor="global-search">
            Global search
          </label>
          <div>
            <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-4">
              <Search size={17} className="shrink-0 text-fg-muted" />
              <input
                aria-label="Global search"
                ref={inputRef}
                id="global-search"
                value={query}
                onChange={(event) => dispatch({ type: "query", value: event.target.value })}
                onKeyDown={(event) => {
                  if (!flatResults.length) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    dispatch({
                      type: "active",
                      value: Math.min(activeIndex + 1, flatResults.length - 1),
                    });
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    dispatch({ type: "active", value: Math.max(activeIndex - 1, 0) });
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const result = flatResults[activeIndex];
                    if (result) {
                      setOpen(false);
                      void navigate(result.href);
                    }
                  }
                }}
                placeholder="Search snapshots, bookmarks, models, schemas"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
              />
              <kbd className="hidden rounded border border-line bg-surface-subtle px-2 py-1 text-2xs font-medium lowercase text-fg-muted md:block">
                esc
              </kbd>
            </div>
            <div className="max-h-[26rem] overflow-y-auto bg-surface-subtle">
              {showPanel ? (
                isFetching ? (
                  <AppCopy className="px-6 py-5">Searching workspace...</AppCopy>
                ) : (data?.groups ?? []).length === 0 ? (
                  <AppCopy className="px-6 py-5">No results.</AppCopy>
                ) : (
                  <div className="py-4">
                    {(data?.groups ?? []).map((group) => {
                      const groupOffset = offset;
                      offset += group.results.length;
                      return (
                        <SearchResultGroup
                          key={group.label}
                          group={group}
                          activeIndex={activeIndex}
                          offset={groupOffset}
                          onHover={(value) => dispatch({ type: "active", value })}
                          onSelect={() => setOpen(false)}
                        />
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="px-6 py-5">
                  <p className="text-sm font-semibold text-fg">Search ML Suite</p>
                  <AppCopy className="mt-1">Type at least two characters.</AppCopy>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
