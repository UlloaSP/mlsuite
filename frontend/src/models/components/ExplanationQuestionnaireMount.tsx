/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	type Ref,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { createMlRegistryPack } from "mlform/builtins-ml";
import { mountWizardForm, type MountedWizardForm } from "mlform/kit";
import type { Transport } from "mlform/runtime";
import type { QuestionnaireSchema } from "../questionnaire-schema";
import {
	buildQuestionnaireFormSchema,
	buildQuestionnaireWizardLayout,
} from "../questionnaire-schema";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { createLocalQuestionnaireTransport } from "../local-questionnaire-transport";
import {
	getQuestionnaireValues,
	submitQuestionnaire,
	toQuestionnaireSchema,
} from "../questionnaire-feedback";

export type ExplanationQuestionnaireMountHandle = {
	submit(): Promise<Record<string, unknown>>;
	getValues(): Record<string, unknown>;
};

type ExplanationQuestionnaireMountProps = {
	ref?: Ref<ExplanationQuestionnaireMountHandle>;
	title: string;
	schema: QuestionnaireSchema;
	initialValues: Record<string, unknown>;
	editable: boolean;
	theme: "light" | "dark";
	mode?: "embedded" | "standalone";
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

export function ExplanationQuestionnaireMount({
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
}: ExplanationQuestionnaireMountProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef<MountedWizardForm | null>(null);
	const initialValuesRef = useRef(initialValues);
	const onValuesChangeRef = useRef(onValuesChange);
	const onStepChangeRef = useRef(onStepChange);
	const [mountError, setMountError] = useState<string | null>(null);
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

		try {
			setMountError(null);
			const mounted = mountWizardForm(containerRef.current, {
				schema: buildQuestionnaireFormSchema(effectiveSchema),
				layout: buildQuestionnaireWizardLayout(effectiveSchema),
				registry: createMlRegistryPack().registry,
				transport: transport ?? createLocalQuestionnaireTransport(),
				initialValues: initialValuesRef.current,
				designSystem: {
					mode: theme,
					theme: "cobalt",
					recipe: "default",
				},
				labels: {
					submit: labels?.submit ?? (editable ? "Check answers" : "Reviewed"),
					submitting: labels?.submitting ?? "Checking answers…",
				},
				reportPane: "hidden",
			});

			if (mode === "embedded") {
				const style = document.createElement("style");
				style.textContent = buildEmbeddedStyles(effectiveSchema.steps.length === 1);
				mounted.host.shadowRoot?.append(style);
			}
			if (square) {
				const style = document.createElement("style");
				style.textContent = "* { border-radius: 0 !important; }";
				mounted.host.shadowRoot?.append(style);
			}

			const unsubscribe = mounted.view.subscribe((snapshot) => {
				onValuesChangeRef.current?.(
					typeof snapshot.form.values === "object" && snapshot.form.values !== null ? snapshot.form.values : {},
				);
				onStepChangeRef.current?.(snapshot.wizard?.currentStepId ?? null);
			});

			mountedRef.current = mounted;
			onValuesChangeRef.current?.(getQuestionnaireValues(mounted));
			onStepChangeRef.current?.(mounted.view.getSnapshot().wizard?.currentStepId ?? null);

			return () => {
				unsubscribe();
				mountedRef.current = null;
				mounted.unmount();
			};
		} catch (error: unknown) {
			setMountError(error instanceof Error ? error.message : String(error));
			return;
		}
	}, [effectiveSchema, mode, serializedSchema, theme, editable, transport, labels?.submit, labels?.submitting, square]);

	if (mountError) {
		return (
			<AppPanel className="space-y-3">
				<AppSectionTitle>{title}</AppSectionTitle>
				<AppCopy>{mountError}</AppCopy>
			</AppPanel>
		);
	}

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
