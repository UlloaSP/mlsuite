/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportController, ReportDescriptor } from "mlform/engine";
import {
	createBuiltinPrimitiveRegistry,
	primitiveStaticText,
	type PrimitiveRegistry,
	type PrimitiveReportRenderContext,
	type PrimitiveReportRequest,
	type PrimitiveReportRendererElement,
	type PrimitiveReportTransport,
	type PrimitiveText,
} from "mlform/primitives";
import { appFetch } from "../../api/appFetch";
import {
	getActiveCustomExplanationDefinitions,
	normalizeCustomExplanationResult,
	resolveCustomExplanationRunner,
} from "./custom-explanation";
import { type PredictionPayloadField, getBackendKey, isRecord, slugify } from "./shared";

type FetchStatus = "idle" | "loading" | "done" | "error";
type ExplanationSection = {
	title: string | null;
	html: string | null;
	blocks: string[];
	emptyText: string | null;
};

const extractErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string" && error.trim().length > 0) {
		return error;
	}

	return String(error);
};

const hashFields = (fields: readonly PredictionPayloadField[]): string => {
	let hash = 0;
	const seed = fields.map((field) => `${field.id}:${getBackendKey(field)}`).join("|");

	for (let index = 0; index < seed.length; index += 1) {
		hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
	}

	return hash.toString(36);
};

const createCustomReportTags = (
	modelId: string,
	fields: readonly PredictionPayloadField[],
) => {
	const suffix = `${slugify(modelId)}-${hashFields(fields)}`;
	return {
		classifier: `mlsuite-classifier-explanation-report-${suffix}`,
		regressor: `mlsuite-regressor-explanation-report-${suffix}`,
	} as const;
};

abstract class PredictionExplanationRendererElement
	extends HTMLElement
	implements PrimitiveReportRendererElement
{
	readonly #modelId: string;
	readonly #fields: readonly PredictionPayloadField[];
	#controller: ReportController | undefined;
	#descriptor: ReportDescriptor | null = null;
	#context: PrimitiveReportRenderContext | undefined;
	#text: PrimitiveText = primitiveStaticText;
	#transport: PrimitiveReportTransport | undefined;
	#request: PrimitiveReportRequest | null = null;

	#status: FetchStatus = "idle";
	#sections: ExplanationSection[] = [];
	#transportError: string | null = null;
	#abortController: AbortController | null = null;
	#lastRequest: PrimitiveReportRequest | null = null;

	protected abstract readonly builtInTagName: "mlf-classifier-report" | "mlf-regressor-report";

	constructor(modelId: string, fields: readonly PredictionPayloadField[]) {
		super();
		this.#modelId = modelId;
		this.#fields = fields;
		this.attachShadow({ mode: "open" });
	}

	get controller() {
		return this.#controller;
	}

	set controller(value: ReportController | undefined) {
		this.#controller = value;
		this.#render();
	}

	get descriptor() {
		return this.#descriptor;
	}

	set descriptor(value: ReportDescriptor | null | undefined) {
		this.#descriptor = value ?? null;
		this.#render();
		if (this.isConnected) {
			void this.#syncTransport();
		}
	}

	get context() {
		return this.#context;
	}

	set context(value: PrimitiveReportRenderContext | undefined) {
		this.#context = value;
		this.#render();
	}

	get text() {
		return this.#text;
	}

	set text(value: PrimitiveText | undefined) {
		this.#text = value ?? primitiveStaticText;
		this.#render();
	}

	get transport() {
		return this.#transport;
	}

	set transport(value: PrimitiveReportTransport | undefined) {
		this.#transport = value;
		this.#lastRequest = null;
		if (this.isConnected) {
			void this.#syncTransport();
		}
	}

	get request() {
		return this.#request;
	}

	set request(value: PrimitiveReportRequest | null | undefined) {
		this.#request = value ?? null;
		if (this.isConnected) {
			void this.#syncTransport();
		}
	}

	connectedCallback(): void {
		this.#render();
		void this.#syncTransport();
	}

	disconnectedCallback(): void {
		this.#abortController?.abort();
		this.#abortController = null;
	}

	#hasExplanationsEnabled(): boolean {
		return isRecord(this.#descriptor?.props) && this.#descriptor.props.explanations === true;
	}

	#shouldFetch(): boolean {
		return this.#hasExplanationsEnabled() && this.#request !== null;
	}

	async #syncTransport(): Promise<void> {
		if (!this.#shouldFetch()) {
			this.#abortController?.abort();
			this.#abortController = null;
			this.#lastRequest = null;
			this.#status = "idle";
			this.#sections = [];
			this.#transportError = null;
			this.#render();
			return;
		}

		const request = this.#request;

		if (!request || request === this.#lastRequest) {
			return;
		}

		this.#abortController?.abort();
		const abortController = new AbortController();
		this.#abortController = abortController;
		this.#lastRequest = request;
		this.#status = "loading";
		this.#sections = [];
		this.#transportError = null;
		this.#render();

		try {
			const result = await this.#resolveExplanationResult({
				...request,
				signal: abortController.signal,
			});

			if (abortController.signal.aborted) {
				return;
			}

			if (result === null) {
				this.#status = "idle";
				this.#sections = [];
				this.#transportError = null;
				this.#render();
				return;
			}

			this.#status = "done";
			this.#sections = result;
			this.#transportError = null;
			this.#render();
		} catch (error: unknown) {
			if (abortController.signal.aborted) {
				return;
			}

			this.#status = "error";
			this.#sections = [];
			this.#transportError = extractErrorMessage(error);
			this.#render();
		}
	}

	async #resolveExplanationResult(
		request: PrimitiveReportRequest,
	): Promise<ExplanationSection[] | null> {
		const instance = this.#buildInstance(request);
		const definitions = await getActiveCustomExplanationDefinitions();
		if (definitions.length === 0) {
			return null;
		}

		const sections: ExplanationSection[] = [];
		for (const definition of definitions) {
			const runner = await resolveCustomExplanationRunner(definition);
			const customResult = await runner({
				request,
				props: isRecord(this.#descriptor?.props) ? this.#descriptor.props : {},
				modelId: this.#modelId,
				instance,
				signal: request.signal ?? new AbortController().signal,
				fetchExplanation: async () => this.#fetchExplanation(request, instance),
				fetchJson: async <T = unknown>(path: string, init?: RequestInit) =>
					appFetch<T>(path, {
						...init,
						signal: init?.signal ?? request.signal,
					}),
			});
			const normalized = normalizeCustomExplanationResult(customResult);
			sections.push({
				title: normalized.title ?? definition.fileName,
				html: normalized.html,
				blocks: normalized.blocks,
				emptyText: normalized.emptyText,
			});
		}

		return sections;
	}

	#buildInstance(request: PrimitiveReportRequest): Record<string, unknown> {
		return Object.fromEntries(
			this.#fields
				.filter((field) => field.id in request.serializedValues)
				.map((field) => [getBackendKey(field), request.serializedValues[field.id]]),
		);
	}

	async #fetchExplanation(
		request: PrimitiveReportRequest,
		instance = this.#buildInstance(request),
	): Promise<string[]> {

		const response = await appFetch<{ explanations: string[] }>(
			`/api/analyzer/explain/by-id?modelId=${encodeURIComponent(this.#modelId)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: request.signal,
				body: JSON.stringify({
					instance,
					traces: [],
				}),
			},
		);

		return Array.isArray(response.explanations)
			? response.explanations.filter(
				(item): item is string => typeof item === "string" && item.trim().length > 0,
			)
			: [];
	}

	#render(): void {
		if (!this.shadowRoot) {
			return;
		}

		const style = document.createElement("style");
		style.textContent = `
			:host {
				display: block;
			}

			.shell {
				display: grid;
				gap: 0.75rem;
			}

			.explanation-panel {
				display: grid;
				gap: 1rem;
				padding-top: 0.25rem;
			}

			.explanation-header {
				margin: 0;
				font-size: 0.72rem;
				font-weight: 700;
				letter-spacing: 0.08em;
				text-transform: uppercase;
				color: var(--mlf-report-label-color, var(--mlf-color-text-muted, #475569));
			}

			.explanation-section {
				display: grid;
				gap: 0.75rem;
			}

			.explanation-section-title {
				margin: 0;
				font-size: 0.74rem;
				font-weight: 700;
				letter-spacing: 0.08em;
				text-transform: uppercase;
				color: var(--mlf-color-text, #0f172a);
			}

			.explanation-loading {
				height: 5rem;
				border-radius: var(--mlf-radius-md, 16px);
				border: var(--mlf-border-width, 1px) solid
					var(--mlf-report-border, var(--mlf-color-border, #e2e8f0));
				background: linear-gradient(
					90deg,
					color-mix(in srgb, var(--mlf-color-surface-muted, #f8fafc) 92%, transparent) 0%,
					color-mix(in srgb, var(--mlf-color-accent, #1e40af) 12%, var(--mlf-color-surface, #fff))
						50%,
					color-mix(in srgb, var(--mlf-color-surface-muted, #f8fafc) 92%, transparent) 100%
				);
				background-size: 220% 100%;
				animation: explanation-shimmer 1.6s linear infinite;
			}

			.explanation-error {
				padding: 0.85rem 1rem;
				border-radius: var(--mlf-radius-md, 16px);
				border: var(--mlf-border-width, 1px) solid
					color-mix(in srgb, var(--mlf-color-danger, #dc2626) 28%, transparent);
				background: color-mix(in srgb, var(--mlf-color-danger, #dc2626) 8%, transparent);
				color: var(--mlf-color-danger, #dc2626);
				font: 500 0.82rem/1.5
					var(
						--mlf-font-family-mono,
						"IBM Plex Mono",
						"SFMono-Regular",
						Consolas,
						"Liberation Mono",
						monospace
					);
				word-break: break-word;
			}

			.explanation-empty,
			.explanation-block {
				margin: 0;
				padding: 0.9rem 1rem;
				border-radius: var(--mlf-radius-md, 16px);
				border: var(--mlf-border-width, 1px) solid
					var(--mlf-report-border, var(--mlf-color-border, #e2e8f0));
				background: var(--mlf-report-bg, var(--mlf-color-surface, #ffffff));
				color: var(--mlf-color-text, #0f172a);
			}

			.explanation-empty {
				color: var(--mlf-color-text-muted, #475569);
				font-size: 0.84rem;
			}

			.explanation-block {
				overflow-x: auto;
				white-space: pre-wrap;
				word-break: break-word;
				font: 500 0.82rem/1.55
					var(
						--mlf-font-family-mono,
						"IBM Plex Mono",
						"SFMono-Regular",
						Consolas,
						"Liberation Mono",
						monospace
					);
			}

			@keyframes explanation-shimmer {
				0% {
					background-position: 200% 0;
				}

				100% {
					background-position: -20% 0;
				}
			}
		`;

		const shell = document.createElement("div");
		shell.className = "shell";

		const reportRenderer = document.createElement(
			this.builtInTagName,
		) as PrimitiveReportRendererElement;
		reportRenderer.controller = this.#controller;
		reportRenderer.descriptor = this.#descriptor;
		reportRenderer.context = this.#context;
		reportRenderer.text = this.#text;
		reportRenderer.transport = undefined;
		reportRenderer.request = null;
		shell.append(reportRenderer);

		const explanationPanel = this.#renderExplanationPanel();
		if (explanationPanel) {
			shell.append(explanationPanel);
		}

		this.shadowRoot.replaceChildren(style, shell);
	}

	#renderExplanationPanel(): HTMLElement | null {
		if (!this.#hasExplanationsEnabled() || this.#status === "idle") {
			return null;
		}

		const panel = document.createElement("section");
		panel.className = "explanation-panel";

		const title = document.createElement("p");
		title.className = "explanation-header";
		title.textContent = this.#text.explanationLabel;
		panel.append(title);

		if (this.#status === "loading") {
			const loading = document.createElement("div");
			loading.className = "explanation-loading";
			loading.setAttribute("aria-label", this.#text.explanationLoadingLabel);
			panel.append(loading);
			return panel;
		}

		if (this.#status === "error") {
			const error = document.createElement("div");
			error.className = "explanation-error";
			error.textContent = `Error: ${this.#transportError ?? "Unknown error"}`;
			panel.append(error);
			return panel;
		}

		for (const sectionResult of this.#sections) {
			const section = document.createElement("section");
			section.className = "explanation-section";

			const sectionTitle = document.createElement("p");
			sectionTitle.className = "explanation-section-title";
			sectionTitle.textContent = sectionResult.title ?? this.#text.explanationLabel;
			section.append(sectionTitle);

			if (sectionResult.html) {
				const htmlContent = document.createElement("div");
				htmlContent.className = "explanation-block";
				htmlContent.innerHTML = sectionResult.html;
				section.append(htmlContent);
			}

			if (!sectionResult.html && sectionResult.blocks.length === 0) {
				const empty = document.createElement("div");
				empty.className = "explanation-empty";
				empty.textContent = sectionResult.emptyText ?? "No explanation returned.";
				section.append(empty);
				panel.append(section);
				continue;
			}

			for (const block of sectionResult.blocks) {
				const content = document.createElement("pre");
				content.className = "explanation-block";
				content.setAttribute("role", "region");
				content.setAttribute("aria-label", this.#text.explanationAriaLabel);
				content.textContent = block;
				section.append(content);
			}

			panel.append(section);
		}

		return panel;
	}
}

class PredictionClassifierExplanationRendererElement extends PredictionExplanationRendererElement {
	protected readonly builtInTagName = "mlf-classifier-report" as const;

	constructor(modelId: string, fields: readonly PredictionPayloadField[]) {
		super(modelId, fields);
	}
}

class PredictionRegressorExplanationRendererElement extends PredictionExplanationRendererElement {
	protected readonly builtInTagName = "mlf-regressor-report" as const;

	constructor(modelId: string, fields: readonly PredictionPayloadField[]) {
		super(modelId, fields);
	}
}

const ensurePredictionExplanationRenderers = (
	modelId: string,
	fields: readonly PredictionPayloadField[],
): void => {
	const customReportTags = createCustomReportTags(modelId, fields);

	if (!customElements.get(customReportTags.classifier)) {
		customElements.define(
			customReportTags.classifier,
			class extends PredictionClassifierExplanationRendererElement {
				constructor() {
					super(modelId, fields);
				}
			},
		);
	}

	if (!customElements.get(customReportTags.regressor)) {
		customElements.define(
			customReportTags.regressor,
			class extends PredictionRegressorExplanationRendererElement {
				constructor() {
					super(modelId, fields);
				}
			},
		);
	}
};

export const createPredictionPrimitiveRegistry = (
	modelId: string,
	fields: readonly PredictionPayloadField[],
): PrimitiveRegistry => {
	ensurePredictionExplanationRenderers(modelId, fields);
	const customReportTags = createCustomReportTags(modelId, fields);
	return createBuiltinPrimitiveRegistry()
		.registerReport("classifier-report", customReportTags.classifier)
		.registerReport("regressor-report", customReportTags.regressor);
};
