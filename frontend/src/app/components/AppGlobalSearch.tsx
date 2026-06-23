import { Search } from "lucide-react";
import { Dialog } from "radix-ui";
import { useAtom } from "jotai";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { useNavigate } from "react-router";
import { useSearchResults } from "../../api/search/hooks";
import { isGlobalSearchShortcut } from "../../algorithms/search/shortcut";
import { SearchResultGroup } from "../../search/components/SearchResultGroup";
import { useDebouncedValue } from "../../search/hooks";
import { globalSearchOpenAtom } from "../atoms";
import { AppCopy } from "./AppCopy";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

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
  const [{ query, activeIndex }, dispatch] = useReducer(searchReducer, {
    query: "",
    activeIndex: 0,
  });
  const debouncedQuery = useDebouncedValue(query);
  const { data, isFetching } = useSearchResults(debouncedQuery);

  const flatResults = useMemo(
    () => (data?.groups ?? []).flatMap((group) => group.results),
    [data?.groups],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isGlobalSearchShortcut(event) && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

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
        <Dialog.Overlay className="fixed inset-0 z-[900] bg-black/25 backdrop-blur-sm transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          aria-label="Global search"
          className={cx(
            FOCUS_RING,
            "fixed left-1/2 top-[14vh] z-[901] w-[min(47rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-hover)] outline-none transition duration-150",
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
          )}
        >
          <label className="sr-only" htmlFor="global-search">
            Global search
          </label>
          <div>
            <div className="flex items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-primary)] px-5 py-4">
              <Search size={17} className="shrink-0 text-[var(--text-muted)]" />
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
                placeholder="Search models, teams, plugins, schemas"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <kbd className="hidden rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-2 py-1 text-[0.68rem] font-medium lowercase text-[var(--text-muted)] md:block">
                esc
              </kbd>
            </div>
            <div className="max-h-[26rem] overflow-y-auto bg-[var(--surface-secondary)]">
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
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Search MLSuite</p>
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
