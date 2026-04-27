/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  PrimitiveFieldRenderContext,
  PrimitiveFieldRendererElement,
  PrimitiveText,
} from "mlform/primitives";
import type { FieldController, FieldDescriptor } from "mlform/engine";
import { toElementString } from "./primitive-renderer-utils";

export class PredictionCustomFieldRendererElement
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
      input.value = typeof value === "number" || typeof value === "string" ? String(value) : "";
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
          option.value = toElementString(optionValue.value);
          option.textContent = toElementString(optionValue.label);
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
      input.value = toElementString(value);
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
