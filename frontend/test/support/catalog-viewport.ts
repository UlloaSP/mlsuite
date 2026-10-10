import { vi } from "vite-plus/test";
export function catalogViewport() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.index ? 112 : 300;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(element: HTMLElement) {
        this.callback(
          [
            {
              target: element,
              contentRect: element.getBoundingClientRect(),
              borderBoxSize: [{ inlineSize: element.offsetWidth, blockSize: element.offsetHeight }],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
}
