// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import {
  ReportQuestionnaireMount,
  type ReportQuestionnaireMountHandle,
} from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import type { Transport } from "mlform/runtime";

const schema = {
  steps: [
    {
      id: "feedback",
      title: "Feedback",
      fields: [{ id: "answer", label: "Answer", kind: "text", required: true }],
    },
  ],
};
let root: Root | null = null;
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("keeps in-flight submission mounted across prop refresh and completes before summary", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const ref = createRef<ReportQuestionnaireMountHandle>();
  const statuses: boolean[] = [];
  let resolve!: (value: { raw: object; reports: never[] }) => void;
  const submit = vi.fn(
    () =>
      new Promise<{ raw: object; reports: never[] }>((done) => {
        resolve = done;
      }),
  );
  const saved = vi.fn((values: Record<string, unknown>) => {
    flushSync(() => root?.render(<p>Saved answer: {String(values.answer)}</p>));
  });
  const render = (transport: Transport) =>
    root?.render(
      <ReportQuestionnaireMount
        ref={ref}
        title="Feedback"
        schema={{ ...schema }}
        initialValues={{ answer: "Reviewed" }}
        editable
        theme="light"
        mode="standalone"
        transport={transport}
        onSubmitted={saved}
        onSubmittingChange={(value) => statuses.push(value)}
      />,
    );
  await act(async () => {
    render({ submit });
    await flush();
  });
  const host = container.querySelector("mlf-kit-wizard");
  expect(host).not.toBeNull();
  let result!: Promise<Record<string, unknown>>;
  await act(async () => {
    result = ref.current!.submit();
    await flush();
  });
  expect(submit).toHaveBeenCalledTimes(1);
  expect(saved).not.toHaveBeenCalled();
  await act(async () => {
    render({ submit: () => submit() });
    await flush();
  });
  expect(container.querySelector("mlf-kit-wizard")).toBe(host);
  await act(async () => {
    resolve({ raw: {}, reports: [] });
    await expect(result).resolves.toEqual({ answer: "Reviewed" });
  });
  expect(statuses).toEqual([true, false]);
  expect(saved).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe("Saved answer: Reviewed");
});

test("preserves save errors without showing a saved summary", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const ref = createRef<ReportQuestionnaireMountHandle>();
  const saved = vi.fn();
  const statuses: boolean[] = [];
  const failure = new Error("Feedback unavailable");
  await act(async () => {
    root?.render(
      <ReportQuestionnaireMount
        ref={ref}
        title="Feedback"
        schema={schema}
        initialValues={{ answer: "Reviewed" }}
        editable
        theme="light"
        transport={{
          submit: async () => {
            throw failure;
          },
        }}
        onSubmitted={saved}
        onSubmittingChange={(value) => statuses.push(value)}
      />,
    );
    await flush();
  });
  await act(async () => {
    await expect(ref.current!.submit()).rejects.toThrow("Feedback unavailable");
  });
  expect(saved).not.toHaveBeenCalled();
  expect(statuses).toEqual([true, false]);
  expect(container.querySelector("mlf-kit-wizard")).not.toBeNull();
});
