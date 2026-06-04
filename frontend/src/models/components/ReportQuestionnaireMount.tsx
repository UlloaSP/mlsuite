/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type Ref, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { createMlRegistryPack } from "mlform/builtins";
import { mountForm, type FormViewController, type MountedForm } from "mlform/kit";
import type { Transport } from "mlform/runtime";
import type { QuestionnaireSchema } from "../questionnaire-schema";
import {
  buildQuestionnaireFormSchema,
  buildQuestionnaireWizardLayout,
} from "../questionnaire-schema";
import { AppSectionTitle } from "../../app/components/ui";
import { createLocalQuestionnaireTransport } from "../local-questionnaire-transport";
import {
  getQuestionnaireValues,
  submitQuestionnaire,
  toQuestionnaireSchema,
} from "../questionnaire-feedback";

export type ReportQuestionnaireMountHandle = {
  submit(): Promise<Record<string, unknown>>;
  getValues(): Record<string, unknown>;
};

type ReportQuestionnaireMountProps = {
  ref?: Ref<ReportQuestionnaireMountHandle>;
  title: string;
  schema: QuestionnaireSchema;
  initialValues: Record<string, unknown>;
  editable: boolean;
  theme: "light" | "dark";
  mode?: "embedded" | "navigation" | "standalone";
  onValuesChange?: (values: Record<string, unknown>) => void;
  onStepChange?: (stepId: string | null) => void;
  transport?: Transport;
  labels?: {
    submit?: string;
    submitting?: string;
  };
  square?: boolean;
};

const buildEmbeddedStyles = (singleStep: boolean): string => `
	.actions { display: none !important; }
	${singleStep ? "mlf-step-indicator { display: none !important; } .pane-header { gap: 0 !important; }" : ""}
`;

const NAVIGATION_ONLY_STYLES = `
	.actions button[type="submit"],
	.actions button[data-action="submit"],
	.actions .submit {
		opacity: 0.45 !important;
		pointer-events: none !important;
	}
`;

const getMountedView = (mounted: MountedForm): FormViewController | undefined =>
  (mounted.host as HTMLElement & { view?: FormViewController }).view;

const renderMountError = (container: HTMLDivElement, error: unknown) => {
  const panel = document.createElement("div");
  panel.className = "space-y-3 border border-[var(--border-soft)] p-4";
  const title = document.createElement("h3");
  title.className = "text-base font-semibold text-[var(--text-primary)]";
  title.textContent = "Questionnaire unavailable";
  const message = document.createElement("p");
  message.className = "text-sm text-[var(--text-secondary)]";
  message.textContent = error instanceof Error ? error.message : String(error);
  panel.replaceChildren(title, message);
  container.replaceChildren(panel);
};

type MountQuestionnaireHostOptions = {
  container: HTMLDivElement;
  effectiveSchema: QuestionnaireSchema;
  editable: boolean;
  initialValues: Record<string, unknown>;
  labels?: ReportQuestionnaireMountProps["labels"];
  mode: "embedded" | "navigation" | "standalone";
  onMounted: (mounted: MountedForm | null) => void;
  onStepChange: (stepId: string | null) => void;
  onValuesChange: (values: Record<string, unknown>) => void;
  square: boolean;
  theme: "light" | "dark";
  transport?: Transport;
};

const mountQuestionnaireHost = ({
  container,
  effectiveSchema,
  editable,
  initialValues,
  labels,
  mode,
  onMounted,
  onStepChange,
  onValuesChange,
  square,
  theme,
  transport,
}: MountQuestionnaireHostOptions): (() => void) => {
  try {
    const mounted = mountForm(container, {
      schema: buildQuestionnaireFormSchema(effectiveSchema),
      layout: buildQuestionnaireWizardLayout(effectiveSchema),
      registry: createMlRegistryPack().registry,
      transport: transport ?? createLocalQuestionnaireTransport(),
      initialValues,
      designSystem: {
        mode: theme,
        theme: "airbnb",
        recipe: "default",
      },
      labels: {
        submit: labels?.submit ?? (editable ? "Check answers" : "Reviewed"),
        submitting: labels?.submitting ?? "Checking answers...",
      },
      reportPane: "hidden",
    });

    if (mode === "embedded") {
      const style = document.createElement("style");
      style.textContent = buildEmbeddedStyles(effectiveSchema.steps.length === 1);
      mounted.host.shadowRoot?.append(style);
    }
    if (mode === "navigation") {
      const style = document.createElement("style");
      style.textContent = NAVIGATION_ONLY_STYLES;
      mounted.host.shadowRoot?.append(style);
    }
    if (square) {
      const style = document.createElement("style");
      style.textContent = "* { border-radius: 0 !important; }";
      mounted.host.shadowRoot?.append(style);
    }

    let lastStepId: string | null = null;
    const emitStepChange = (stepId: string | null) => {
      if (lastStepId === stepId) return;
      lastStepId = stepId;
      onStepChange(stepId);
    };
    const unsubscribeForm = mounted.form.subscribe((snapshot) => {
      onValuesChange(
        typeof snapshot.values === "object" && snapshot.values !== null ? snapshot.values : {},
      );
    });
    const view = getMountedView(mounted);
    const unsubscribeView = view?.subscribe((snapshot) => {
      emitStepChange(snapshot.wizard?.currentStepId ?? null);
    });

    onMounted(mounted);
    onValuesChange(getQuestionnaireValues(mounted));
    emitStepChange(view?.getSnapshot().wizard?.currentStepId ?? null);

    return () => {
      unsubscribeForm();
      unsubscribeView?.();
      onMounted(null);
      mounted.unmount();
    };
  } catch (error: unknown) {
    renderMountError(container, error);
    return () => {};
  }
};

export function ReportQuestionnaireMount({
  ref,
  title,
  schema,
  initialValues,
  editable,
  theme,
  mode = "embedded",
  onValuesChange,
  onStepChange,
  transport,
  labels,
  square = false,
}: ReportQuestionnaireMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedForm | null>(null);
  const initialValuesRef = useRef(initialValues);
  const onValuesChangeRef = useRef(onValuesChange);
  const onStepChangeRef = useRef(onStepChange);
  const currentStepIdRef = useRef<string | null>(null);
  const effectiveSchema = useMemo(
    () => toQuestionnaireSchema(schema, editable),
    [editable, schema],
  );
  const serializedSchema = JSON.stringify(effectiveSchema);

  useImperativeHandle(ref, () => ({
    async submit() {
      return submitQuestionnaire(mountedRef.current);
    },
    getValues() {
      return getQuestionnaireValues(mountedRef.current);
    },
  }));

  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    return mountQuestionnaireHost({
      container: containerRef.current,
      effectiveSchema,
      editable,
      initialValues: initialValuesRef.current,
      labels,
      mode,
      onMounted: (mounted) => {
        mountedRef.current = mounted;
      },
      onStepChange: (stepId) => {
        currentStepIdRef.current = stepId;
        onStepChangeRef.current?.(stepId);
      },
      onValuesChange: (values) => onValuesChangeRef.current?.(values),
      square,
      theme,
      transport,
    });
  }, [effectiveSchema, editable, labels, mode, serializedSchema, square, theme, transport]);

  return (
    <div className="space-y-3">
      <AppSectionTitle>{title}</AppSectionTitle>
      <div
        ref={containerRef}
        className="min-h-[18rem] overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-primary)]"
      />
    </div>
  );
}
