/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportController } from "mlform/runtime";
import type { ReportDescriptor } from "mlform/presentation";
import type {
  PrimitiveReportRenderContext,
  PrimitiveReportRendererElement,
  PrimitiveText,
} from "mlform/primitives";
import { normalizeCustomExplanationResult } from "./custom-explanation";

export const CUSTOM_REPORT_RENDERER_TAG = "mlsuite-custom-report-renderer";

export class PredictionCustomReportRendererElement
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
        (state?.status === "loading" ? "Loading report…" : "No report content returned.");
      shell.append(empty);
    }

    this.shadowRoot.replaceChildren(style, shell);
  }
}

const isRenderableResult = (value: unknown): boolean =>
  typeof value === "string" ||
  Array.isArray(value) ||
  (typeof value === "object" && value !== null);
