// @vitest-environment jsdom
import { act, createRef, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { expect, test, vi } from "vite-plus/test";
import {
  ReportQuestionnaireMount,
  type ReportQuestionnaireMountHandle,
} from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import type { Transport } from "mlform/runtime";
import type { FormViewController } from "mlform/view";
import { mount } from "./support/dom";

const schema = {
  steps: [
    {
      id: "feedback",
      title: "Feedback",
      fields: [{ id: "answer", label: "Answer", kind: "text", required: true }],
    },
  ],
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
async function mountSettled(ui: ReactNode) {
  const view = await mount(ui);
  await act(flush);
  return view;
}

test("keeps in-flight submission mounted across prop refresh and completes before summary", async () => {
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
    flushSync(() => view.root.render(<p>Saved answer: {String(values.answer)}</p>));
  });
  const questionnaire = (transport: Transport) => (
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
    />
  );
  const view = await mountSettled(questionnaire({ submit }));
  const container = view.host;
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
    view.root.render(questionnaire({ submit: () => submit() }));
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
  const ref = createRef<ReportQuestionnaireMountHandle>();
  const saved = vi.fn();
  const statuses: boolean[] = [];
  const failure = new Error("Feedback unavailable");
  const { host: container } = await mountSettled(
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
  await act(async () => {
    await expect(ref.current!.submit()).rejects.toThrow("Feedback unavailable");
  });
  expect(saved).not.toHaveBeenCalled();
  expect(statuses).toEqual([true, false]);
  expect(container.querySelector("mlf-kit-wizard")).not.toBeNull();
});

test("the kit submit action completes before its callback removes the form", async () => {
  const saved = vi.fn(() => {
    flushSync(() => view.root.render(<p>Saved review</p>));
  });
  const view = await mountSettled(
    <ReportQuestionnaireMount
      schema={schema}
      initialValues={{ answer: "Reviewed" }}
      editable
      theme="light"
      mode="standalone"
      onSubmitted={saved}
    />,
  );
  await act(async () => {
    view.host
      .querySelector("mlf-kit-wizard")
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".btn-submit")
      ?.click();
    await flush();
  });
  expect(saved).toHaveBeenCalledWith({ answer: "Reviewed" });
  expect(view.host.textContent).toBe("Saved review");
});

test("reports completion callback errors and allows another submission", async () => {
  const ref = createRef<ReportQuestionnaireMountHandle>();
  const statuses: boolean[] = [];
  const saved = vi
    .fn()
    .mockRejectedValueOnce(new Error("Refresh failed"))
    .mockResolvedValueOnce(undefined);
  const { host } = await mountSettled(
    <ReportQuestionnaireMount
      ref={ref}
      schema={schema}
      initialValues={{ answer: "Reviewed" }}
      editable
      theme="light"
      onSubmitted={saved}
      onSubmittingChange={(value) => statuses.push(value)}
    />,
  );
  await act(async () => {
    await expect(ref.current!.submit()).rejects.toThrow("Refresh failed");
  });
  const wizard = host.querySelector<HTMLElement & { view: FormViewController }>("mlf-kit-wizard");
  expect(wizard?.view.form.state.errors.form).toEqual(["Refresh failed"]);
  await act(async () => {
    await expect(ref.current!.submit()).resolves.toEqual({ answer: "Reviewed" });
  });
  expect(statuses).toEqual([true, false, true, false]);
});
