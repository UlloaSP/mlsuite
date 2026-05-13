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
import { mountWizardForm, type MountedWizardForm } from "mlform/kit";
import type { QuestionnaireSchema } from "../questionnaire-schema";
import {
	buildQuestionnaireFormSchema,
	buildQuestionnaireWizardLayout,
} from "../questionnaire-schema";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { createMlSuiteBuiltinRegistry } from "../../app/utils/mlform/builtin-registry";
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
}: ExplanationQuestionnaireMountProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef<MountedWizardForm | null>(null);
	const initialValuesRef = useRef(initialValues);
	const onValuesChangeRef = useRef(onValuesChange);
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
		if (!containerRef.current) {
			return;
		}

		try {
			setMountError(null);
			const mounted = mountWizardForm(containerRef.current, {
				schema: buildQuestionnaireFormSchema(effectiveSchema),
				layout: buildQuestionnaireWizardLayout(effectiveSchema),
				registry: createMlSuiteBuiltinRegistry(),
				transport: createLocalQuestionnaireTransport(),
				initialValues: initialValuesRef.current,
				designSystem: {
					mode: theme,
					theme: "cobalt",
					recipe: "default",
				},
				labels: {
					submit: editable ? "Check answers" : "Reviewed",
					submitting: "Checking answers…",
				},
				reportPane: "hidden",
			});

			if (mode === "embedded") {
				const style = document.createElement("style");
				style.textContent = buildEmbeddedStyles(effectiveSchema.steps.length === 1);
				mounted.host.shadowRoot?.append(style);
			}

			const unsubscribe = mounted.form.subscribe((state: { values: Record<string, unknown> }) => {
				onValuesChangeRef.current?.(
					typeof state.values === "object" && state.values !== null ? state.values : {},
				);
			});

			mountedRef.current = mounted;
			onValuesChangeRef.current?.(getQuestionnaireValues(mounted));

			return () => {
				unsubscribe();
				mountedRef.current = null;
				mounted.unmount();
			};
		} catch (error: unknown) {
			setMountError(error instanceof Error ? error.message : String(error));
			return;
		}
	}, [effectiveSchema, mode, serializedSchema, theme, editable]);

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
				className="min-h-[18rem] overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)]"
			/>
		</div>
	);
}
