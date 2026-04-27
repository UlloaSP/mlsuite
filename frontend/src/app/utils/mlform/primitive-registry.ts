/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
	FieldController,
	FieldDescriptor,
	ReportController,
	ReportDescriptor,
} from "mlform/engine";
import {
	createBuiltinPrimitiveRegistry,
	type PrimitiveFieldRenderContext,
	type PrimitiveFieldRendererElement,
	type PrimitiveReportRenderContext,
	type PrimitiveReportRendererElement,
	type PrimitiveRegistry,
	type PrimitiveText,
} from "mlform/primitives";
import { CUSTOM_FIELD_COMPONENT } from "./custom-field";
import { normalizeCustomExplanationResult } from "./custom-explanation";
import { CUSTOM_REPORT_COMPONENT } from "./custom-report";

const CUSTOM_FIELD_RENDERER_TAG = "mlsuite-custom-field-renderer";
const CUSTOM_REPORT_RENDERER_TAG = "mlsuite-custom-report-renderer";

class PredictionCustomFieldRendererElement
	extends HTMLElement
	implements PrimitiveFieldRendererElement
{
	#controller: FieldController | undefined;
	#descriptor: FieldDescriptor | null = null;
	#context: PrimitiveFieldRenderContext | undefined;

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}

	set controller(value: FieldController | undefined) {
		this.#controller = value;
		this.#render();
	}

	set descriptor(value: FieldDescriptor | null | undefined) {
		this.#descriptor = value ?? null;
		this.#render();
	}

	set context(value: PrimitiveFieldRenderContext | undefined) {
		this.#context = value;
		this.#render();
	}

	set text(_value: PrimitiveText | undefined) {
		this.#render();
	}

	connectedCallback(): void {
		this.#render();
	}

	#render(): void {
		if (!this.shadowRoot) {
			return;
		}

		const props = this.#descriptor?.props ?? {};
		const mode = typeof props.mode === "string" ? props.mode : "text";
		const value = props.value;
		const disabled = this.#context?.disabled ?? false;
		const readOnly = this.#context?.readOnly ?? false;
		const invalid = this.#context?.invalid ?? false;
		const describedBy = this.#context?.describedBy;

		const style = document.createElement("style");
		style.textContent = `
			:host { display: block; }
			.wrap { display: grid; gap: 0.7rem; }
			.input, .select, .textarea {
				width: 100%;
				border-radius: 16px;
				border: 1px solid var(--mlf-color-border, #cbd5e1);
				background: var(--mlf-color-surface, #fff);
				color: var(--mlf-color-text, #0f172a);
				padding: 0.9rem 1rem;
				font: 500 0.92rem/1.4 var(--mlf-font-family-sans, system-ui, sans-serif);
			}
			.textarea { min-height: 7rem; resize: vertical; }
			.range { width: 100%; }
			.meta { color: var(--mlf-color-text-muted, #475569); font-size: 0.78rem; }
		`;

		const wrap = document.createElement("div");
		wrap.className = "wrap";

		const assignCommon = (element: HTMLElement) => {
			if (describedBy) {
				element.setAttribute("aria-describedby", describedBy);
			}
			element.setAttribute("aria-invalid", invalid ? "true" : "false");
			if (disabled) {
				element.setAttribute("disabled", "");
			}
			if (readOnly && ("readOnly" in element || element instanceof HTMLInputElement)) {
				element.setAttribute("readonly", "");
			}
			element.addEventListener("blur", () => this.#controller?.blur());
		};

		if (mode === "textarea") {
			const textarea = document.createElement("textarea");
			textarea.className = "textarea";
			textarea.value = typeof value === "string" ? value : "";
			textarea.placeholder = typeof props.placeholder === "string" ? props.placeholder : "";
			assignCommon(textarea);
			textarea.addEventListener("input", () => this.#controller?.setValue(textarea.value));
			wrap.append(textarea);
		} else if (mode === "number" || mode === "range") {
			const input = document.createElement("input");
			input.className = mode === "range" ? "range" : "input";
			input.type = mode;
			input.value =
				typeof value === "number" || typeof value === "string" ? String(value) : "";
			if (typeof props.min === "number") {
				input.min = String(props.min);
			}
			if (typeof props.max === "number") {
				input.max = String(props.max);
			}
			if (typeof props.step === "number") {
				input.step = String(props.step);
			}
			assignCommon(input);
			input.addEventListener("input", () => {
				this.#controller?.setValue(mode === "range" ? Number(input.value) : input.value);
			});
			wrap.append(input);
		} else if (mode === "select" && Array.isArray(props.options)) {
			const select = document.createElement("select");
			select.className = "select";
			assignCommon(select);

			for (const optionValue of props.options) {
				const option = document.createElement("option");
				if (typeof optionValue === "string") {
					option.value = optionValue;
					option.textContent = optionValue;
				} else if (
					typeof optionValue === "object" &&
					optionValue !== null &&
					"label" in optionValue &&
					"value" in optionValue
				) {
					option.value = String(optionValue.value);
					option.textContent = String(optionValue.label);
				} else {
					continue;
				}
				select.append(option);
			}

			select.value = typeof value === "string" ? value : "";
			select.addEventListener("change", () => this.#controller?.setValue(select.value));
			wrap.append(select);
		} else if (mode === "boolean") {
			const select = document.createElement("select");
			select.className = "select";
			assignCommon(select);
			for (const [optionValue, optionLabel] of [
				["", "Select"],
				["true", typeof props.trueLabel === "string" ? props.trueLabel : "True"],
				["false", typeof props.falseLabel === "string" ? props.falseLabel : "False"],
			]) {
				const option = document.createElement("option");
				option.value = optionValue;
				option.textContent = optionLabel;
				select.append(option);
			}
			select.value = typeof value === "boolean" ? String(value) : "";
			select.addEventListener("change", () => {
				if (select.value === "") {
					this.#controller?.setValue(null);
					return;
				}
				this.#controller?.setValue(select.value === "true");
			});
			wrap.append(select);
		} else {
			const input = document.createElement("input");
			input.className = "input";
			input.type = "text";
			input.value = typeof value === "string" ? value : value == null ? "" : String(value);
			input.placeholder = typeof props.placeholder === "string" ? props.placeholder : "";
			assignCommon(input);
			input.addEventListener("input", () => this.#controller?.setValue(input.value));
			wrap.append(input);
		}

		if (mode === "range") {
			const meta = document.createElement("div");
			meta.className = "meta";
			meta.textContent = `Value: ${typeof value === "number" || typeof value === "string" ? value : ""}`;
			wrap.append(meta);
		}

		this.shadowRoot.replaceChildren(style, wrap);
	}
}

class PredictionCustomReportRendererElement
	extends HTMLElement
	implements PrimitiveReportRendererElement
{
	#controller: ReportController | undefined;
	#descriptor: ReportDescriptor | null = null;
	#context: PrimitiveReportRenderContext | undefined;

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}

	set controller(value: ReportController | undefined) {
		this.#controller = value;
		this.#render();
	}

	set descriptor(value: ReportDescriptor | null | undefined) {
		this.#descriptor = value ?? null;
		this.#render();
	}

	set context(value: PrimitiveReportRenderContext | undefined) {
		this.#context = value;
		this.#render();
	}

	set text(_value: PrimitiveText | undefined) {
		this.#render();
	}

	connectedCallback(): void {
		this.#render();
	}

	#render(): void {
		if (!this.shadowRoot) {
			return;
		}

		const state = this.#controller?.state;
		const props = this.#descriptor?.props ?? {};
		const normalized = normalizeCustomExplanationResult(
			isRenderableResult(props.result) ? props.result : props.payload,
		);
		const title =
			normalized.title ??
			(typeof props.label === "string" ? props.label : null) ??
			this.#context?.label ??
			null;

		const style = document.createElement("style");
		style.textContent = `
			:host { display: block; }
			.shell { display: grid; gap: 0.85rem; }
			.title { margin: 0; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mlf-color-text, #0f172a); }
			.block, .empty, .error {
				margin: 0;
				padding: 0.9rem 1rem;
				border-radius: 16px;
				border: 1px solid var(--mlf-color-border, #e2e8f0);
				background: var(--mlf-color-surface, #fff);
			}
			.block { white-space: pre-wrap; word-break: break-word; font: 500 0.82rem/1.55 var(--mlf-font-family-mono, monospace); }
			.html { font: inherit; white-space: normal; overflow-x: auto; }
			.empty { color: var(--mlf-color-text-muted, #475569); font-size: 0.84rem; }
			.error { color: var(--mlf-color-danger, #dc2626); border-color: color-mix(in srgb, var(--mlf-color-danger, #dc2626) 28%, transparent); background: color-mix(in srgb, var(--mlf-color-danger, #dc2626) 8%, transparent); }
		`;

		const shell = document.createElement("div");
		shell.className = "shell";

		if (state?.status === "error") {
			const error = document.createElement("div");
			error.className = "error";
			error.textContent = state.error ?? "Unknown report error";
			shell.append(error);
			this.shadowRoot.replaceChildren(style, shell);
			return;
		}

		if (title) {
			const heading = document.createElement("p");
			heading.className = "title";
			heading.textContent = title;
			shell.append(heading);
		}

		if (normalized.html) {
			const html = document.createElement("div");
			html.className = "block html";
			html.innerHTML = normalized.html;
			shell.append(html);
		}

		for (const blockText of normalized.blocks) {
			const block = document.createElement("pre");
			block.className = "block";
			block.textContent = blockText;
			shell.append(block);
		}

		if (normalized.jsonFallback) {
			const block = document.createElement("pre");
			block.className = "block";
			block.textContent = normalized.jsonFallback;
			shell.append(block);
		}

		if (!normalized.html && normalized.blocks.length === 0 && !normalized.jsonFallback) {
			const empty = document.createElement("div");
			empty.className = "empty";
			empty.textContent =
				normalized.emptyText ??
				(state?.status === "loading" ? "Loading report..." : "No report content returned.");
			shell.append(empty);
		}

		this.shadowRoot.replaceChildren(style, shell);
	}
}

const isRenderableResult = (value: unknown): boolean =>
	typeof value === "string" ||
	Array.isArray(value) ||
	(typeof value === "object" && value !== null);

const ensurePredictionFieldRenderer = (): void => {
	if (!customElements.get(CUSTOM_FIELD_RENDERER_TAG)) {
		customElements.define(CUSTOM_FIELD_RENDERER_TAG, PredictionCustomFieldRendererElement);
	}
};

const ensurePredictionReportRenderer = (): void => {
	if (!customElements.get(CUSTOM_REPORT_RENDERER_TAG)) {
		customElements.define(CUSTOM_REPORT_RENDERER_TAG, PredictionCustomReportRendererElement);
	}
};

export const createPredictionPrimitiveRegistry = (): PrimitiveRegistry => {
	ensurePredictionFieldRenderer();
	ensurePredictionReportRenderer();
	return createBuiltinPrimitiveRegistry()
		.registerField(CUSTOM_FIELD_COMPONENT, CUSTOM_FIELD_RENDERER_TAG)
		.registerReport(CUSTOM_REPORT_COMPONENT, CUSTOM_REPORT_RENDERER_TAG);
};
