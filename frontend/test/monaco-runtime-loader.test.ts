import { afterEach, expect, test, vi } from "vite-plus/test";

afterEach(() => {
  vi.doUnmock("monaco-editor");
  vi.doUnmock("@monaco-editor/react");
  vi.doUnmock("monaco-editor/esm/vs/editor/editor.worker?worker");
  vi.doUnmock("monaco-editor/esm/vs/language/json/json.worker?worker");
  vi.resetModules();
  Reflect.deleteProperty(globalThis, "MonacoEnvironment");
});

test("configures the React wrapper with the local Monaco instance once", async () => {
  const config = vi.fn();
  const Editor = vi.fn();
  const EditorWorker = vi.fn(function EditorWorker() {
    return { kind: "editor" };
  });
  const JsonWorker = vi.fn(function JsonWorker() {
    return { kind: "json" };
  });
  vi.doMock("monaco-editor", () => ({ editor: { create: vi.fn() } }));
  vi.doMock("@monaco-editor/react", () => ({ Editor, loader: { config } }));
  vi.doMock("monaco-editor/esm/vs/editor/editor.worker?worker", () => ({
    default: EditorWorker,
  }));
  vi.doMock("monaco-editor/esm/vs/language/json/json.worker?worker", () => ({
    default: JsonWorker,
  }));

  const { loadLocalMonacoEditor } = await import("@/capabilities/editor/load-local-monaco-editor");
  const first = loadLocalMonacoEditor();
  const second = loadLocalMonacoEditor();

  await expect(first).resolves.toEqual({ default: Editor });
  await expect(second).resolves.toEqual({ default: Editor });
  expect(config).toHaveBeenCalledOnce();
  expect(config).toHaveBeenCalledWith({
    monaco: expect.objectContaining({ editor: expect.anything() }),
  });
  expect(globalThis.MonacoEnvironment?.getWorker?.("", "json")).toEqual({ kind: "json" });
  expect(globalThis.MonacoEnvironment?.getWorker?.("", "editorWorkerService")).toEqual({
    kind: "editor",
  });
});

test("propagates local Monaco configuration failures", async () => {
  const config = vi.fn(() => {
    throw new Error("local Monaco configuration failed");
  });
  vi.doMock("monaco-editor", () => ({ editor: { create: vi.fn() } }));
  vi.doMock("@monaco-editor/react", () => ({ Editor: vi.fn(), loader: { config } }));
  vi.doMock("monaco-editor/esm/vs/editor/editor.worker?worker", () => ({
    default: vi.fn(),
  }));
  vi.doMock("monaco-editor/esm/vs/language/json/json.worker?worker", () => ({
    default: vi.fn(),
  }));

  const { loadLocalMonacoEditor } = await import("@/capabilities/editor/load-local-monaco-editor");

  await expect(loadLocalMonacoEditor()).rejects.toThrow("local Monaco configuration failed");
  expect(config).toHaveBeenCalledOnce();
});
