/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { MountedForm } from "mlform/kit";
import type { SubmitResult } from "mlform/runtime";
import { submissionValues } from "./questionnaire-feedback";

export const attachQuestionnaireSubmission = (
  mounted: MountedForm,
  onSubmitted?: (values: Record<string, unknown>) => unknown,
  onSubmittingChange?: (submitting: boolean) => void,
): void => {
  const submit = mounted.form.submit.bind(mounted.form);
  let pending: Promise<SubmitResult> | null = null;
  mounted.form.submit = (options) => {
    if (pending) return pending;
    pending = Promise.resolve().then(async () => {
      let submitted = false;
      try {
        onSubmittingChange?.(true);
        const result = await submit(options);
        submitted = true;
        // Completion may unmount the form; it runs after MLForm settles, under the same guard.
        mounted.host.inert = true;
        mounted.host.setAttribute("aria-busy", "true");
        await onSubmitted?.(submissionValues(result.inputs));
        return result;
      } catch (error) {
        if (submitted && mounted.form.state.lifecycle === "active") {
          mounted.form.setExternalErrors({
            form: [error instanceof Error ? error.message : String(error)],
          });
        }
        throw error;
      } finally {
        pending = null;
        mounted.host.inert = false;
        mounted.host.removeAttribute("aria-busy");
        onSubmittingChange?.(false);
      }
    });
    return pending;
  };
};
