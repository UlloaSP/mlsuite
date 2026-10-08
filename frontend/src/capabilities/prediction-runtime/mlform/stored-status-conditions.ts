/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { baseFieldConfigSchema } from "mlform/schema";
import type { FieldConditionContext, FormController } from "mlform/runtime";
import { isRecord } from "./shared";
import { evaluateStoredCondition } from "./stored-condition-evaluation";

export const storedFormStatuses = [
  "idle",
  "editing",
  "validating",
  "submitting",
  "success",
  "error",
] as const;
type Status = (typeof storedFormStatuses)[number];
type Tracker = { status: Status; operation: string; form?: FormController };
const trackers = new WeakMap<object, Tracker>();

const validationCondition = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (value.kind === "form-status") {
    const expected = Array.isArray(value.equals) ? value.equals : [value.equals];
    if (
      !expected.length ||
      !expected.every((status) => storedFormStatuses.some((valid) => valid === status))
    )
      return value;
    return { kind: "form-operation", equals: "idle" };
  }
  if ((value.kind === "all" || value.kind === "any") && Array.isArray(value.conditions)) {
    const original = value.conditions;
    const conditions = original.map(validationCondition);
    return conditions.some((condition, index) => condition !== original[index])
      ? { ...value, conditions }
      : value;
  }
  if (value.kind === "not") {
    const condition = validationCondition(value.condition);
    return condition === value.condition ? value : { ...value, condition };
  }
  return value;
};

const statusFor = (tracker: Tracker, context: FieldConditionContext): Status => {
  if (context.formOperation !== "idle") tracker.status = context.formOperation;
  else if (tracker.operation === "submitting") {
    tracker.status =
      context.submissionStatus === "succeeded"
        ? "success"
        : context.submissionStatus === "failed"
          ? "error"
          : "idle";
  } else if (tracker.operation === "validating") {
    tracker.status = tracker.form?.state.dirty || tracker.form?.state.touched ? "editing" : "idle";
  }
  tracker.operation = context.formOperation;
  return tracker.status;
};

/** Stored JSON retains its old condition; only the runtime receives a predicate. */
export const withStoredStatusConditions = <T>(schema: T): T => {
  if (!isRecord(schema) || !Array.isArray(schema.fields)) return schema;
  const tracker: Tracker = { status: "idle", operation: "idle" };
  return {
    ...schema,
    fields: schema.fields.map((field) => {
      if (!isRecord(field)) return field;
      const next = { ...field };
      for (const key of ["disabledWhen", "hiddenWhen", "readOnlyWhen"]) {
        const condition = field[key];
        const validated = validationCondition(condition);
        if (
          validated === condition ||
          !baseFieldConfigSchema.shape.disabledWhen.safeParse(validated).success
        )
          continue;
        const storedCondition = structuredClone(condition);
        const predicate = (context: FieldConditionContext) =>
          evaluateStoredCondition(storedCondition, context, statusFor(tracker, context));
        trackers.set(predicate, tracker);
        next[key] = predicate;
      }
      return next;
    }),
  };
};

export const connectStoredStatusConditions = (form: FormController): void => {
  const active = new Set<Tracker>();
  for (const field of form.fields) {
    for (const key of ["disabledWhen", "hiddenWhen", "readOnlyWhen"] as const) {
      const condition = field.config[key];
      if (typeof condition !== "function") continue;
      const tracker = trackers.get(condition);
      if (tracker) {
        tracker.form = form;
        active.add(tracker);
      }
    }
  }
  if (!active.size) return;
  const setStatus = (status: Status, operation = "idle") => {
    for (const tracker of active) Object.assign(tracker, { status, operation });
  };
  const setValues = form.setValues.bind(form);
  const editing = (action: () => void): void => {
    action();
    setStatus("editing");
    // Refresh flags after native preparation so a field can accept its first edit before locking.
    setValues({});
  };
  for (const field of form.fields) {
    const setValue = field.setValue.bind(field);
    field.setValue = (value) => editing(() => setValue(value));
    const blur = field.blur.bind(field);
    field.blur = () => {
      blur();
      setStatus("editing");
    };
  }
  form.setValues = (values) => editing(() => setValues(values));
  const reset = form.reset.bind(form);
  form.reset = () => {
    setStatus("idle");
    reset();
  };
  const restore = form.restoreSnapshot.bind(form);
  form.restoreSnapshot = (snapshot) => {
    setStatus("idle");
    restore(snapshot);
  };
  const unsubscribe = form.subscribeTransitions((transition) => {
    switch (transition.type) {
      case "validation-started":
        setStatus("validating", "validating");
        break;
      case "validation-finished":
        setStatus(form.state.dirty || form.state.touched ? "editing" : "idle");
        break;
      case "submission-started":
        setStatus("submitting", "submitting");
        break;
      case "submission-succeeded":
        setStatus("success");
        break;
      case "validation-failed":
      case "submission-failed":
        setStatus("error");
        break;
      case "reset":
      case "restored":
      case "submission-aborted":
        setStatus("idle");
        break;
    }
  });
  const dispose = form.dispose.bind(form);
  form.dispose = () => {
    unsubscribe();
    dispose();
  };
};

export const allowStoredStatusJsonSchema = (value: unknown): void => {
  if (!isRecord(value)) return;
  if (
    Array.isArray(value.anyOf) &&
    value.anyOf.some(
      (variant) =>
        isRecord(variant) &&
        isRecord(variant.properties) &&
        isRecord(variant.properties.kind) &&
        variant.properties.kind.const === "form-operation",
    )
  )
    value.anyOf.push({
      type: "object",
      properties: {
        kind: { const: "form-status" },
        equals: {
          anyOf: [
            { enum: storedFormStatuses },
            { type: "array", items: { enum: storedFormStatuses }, minItems: 1 },
          ],
        },
      },
      required: ["kind", "equals"],
    });
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach(allowStoredStatusJsonSchema);
    else allowStoredStatusJsonSchema(child);
  }
};
