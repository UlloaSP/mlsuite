import { describe, expect, test } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import {
  createMlformJsonSchema,
  validateMlformSchema,
} from "@/capabilities/prediction-runtime/mlform/schema-validation";
import { connectStoredStatusConditions } from "@/capabilities/prediction-runtime/mlform/stored-status-conditions";

const field = { id: "value", kind: "number", label: "Value", mappedTo: "value", defaultValue: 1 };
const stored = (equals: unknown) => ({ kind: "form-status", equals });
const create = (schema: unknown, options: Partial<Parameters<typeof createForm>[0]> = {}) => {
  const runtime = createSchemaRunRuntime({ schema, bindings: [] });
  const form = createForm({
    schema: runtime.formSchema,
    registry: runtime.registry,
    transport: { submit: async () => ({ reports: [] }) },
    ...options,
  });
  connectStoredStatusConditions(form);
  return form;
};

describe("stored form-status conditions", () => {
  test("isolates mounted conditions from later changes to their source schema", () => {
    const condition = stored("success");
    const form = create({
      fields: [
        field,
        {
          ...field,
          id: "controlled",
          label: "Controlled",
          mappedTo: "controlled",
          disabledWhen: condition,
        },
      ],
      reports: [],
    });
    condition.equals = "editing";
    form.getField("value")!.setValue(2);
    expect(form.getField("controlled")!.state.disabled).toBe(false);
    form.dispose();
  });
  test.each(["disabledWhen", "hiddenWhen", "readOnlyWhen"])(
    "preserves %s through editing, submission, and reset",
    async (key) => {
      const schema = {
        fields: [
          field,
          {
            ...field,
            id: "controlled",
            label: "Controlled",
            mappedTo: "controlled",
            [key]: stored(["editing", "submitting", "success"]),
          },
        ],
        reports: [],
      };
      const original = structuredClone(schema);
      let finish!: () => void;
      const form = create(schema, {
        transport: {
          submit: () =>
            new Promise((resolve) => {
              finish = () => resolve({ reports: [] });
            }),
        },
      });
      const active = () => {
        const state = form.getField("controlled")!.state;
        return key === "hiddenWhen"
          ? !state.visible
          : key === "disabledWhen"
            ? state.disabled
            : state.readOnly;
      };
      expect(active()).toBe(false);
      form.getField("value")!.setValue(2);
      expect(active()).toBe(true);
      const pending = form.submit();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(form.state.operation).toBe("submitting");
      expect(active()).toBe(true);
      finish();
      await pending;
      expect(active()).toBe(true);
      form.reset();
      expect(active()).toBe(false);
      expect(schema).toEqual(original);
      form.dispose();
    },
  );

  test("success and errors stop matching after later edits or validation", async () => {
    let fail = false;
    const form = create(
      {
        fields: [
          field,
          {
            ...field,
            id: "success",
            label: "Success",
            mappedTo: "success",
            readOnlyWhen: stored("success"),
          },
          {
            ...field,
            id: "error",
            label: "Error",
            mappedTo: "error",
            disabledWhen: stored("error"),
          },
        ],
        reports: [],
      },
      {
        transport: {
          submit: async () => {
            if (fail) throw new Error("Unavailable");
            return { reports: [] };
          },
        },
      },
    );
    await form.submit();
    expect(form.getField("success")!.state.readOnly).toBe(true);
    expect(() => form.getField("success")!.setValue(2)).toThrow("read-only");
    form.setValues({ value: 2 });
    expect(form.getField("success")!.state.readOnly).toBe(false);
    expect(form.state.submissionStatus).toBe("succeeded");
    fail = true;
    await expect(form.submit()).rejects.toThrow("Unavailable");
    expect(form.getField("error")!.state.disabled).toBe(true);
    form.getField("value")!.setValue(3);
    expect(form.getField("error")!.state.disabled).toBe(false);
    await form.validate();
    expect(form.getField("error")!.state.disabled).toBe(false);
    form.dispose();
  });

  test("includes nested all/any/not groups and current field conditions", () => {
    const condition = {
      kind: "all",
      conditions: [
        { kind: "any", conditions: [stored("editing"), stored("success")] },
        { kind: "not", condition: stored("submitting") },
        { kind: "field-value", field: "value", greaterThan: 1 },
        { kind: "field-comparison", field: "value", otherField: "controlled", operator: "gt" },
      ],
    };
    const form = create({
      fields: [
        field,
        {
          ...field,
          id: "controlled",
          label: "Controlled",
          mappedTo: "controlled",
          hiddenWhen: condition,
        },
      ],
      reports: [],
    });
    expect(form.getField("controlled")!.state.visible).toBe(true);
    form.getField("value")!.setValue(2);
    expect(form.getField("controlled")!.state.visible).toBe(false);
    form.reset();
    expect(form.getField("controlled")!.state.visible).toBe(true);
    form.dispose();
  });

  test("retains the error condition when validation throws without changing submission status", async () => {
    const form = create(
      {
        fields: [
          field,
          {
            ...field,
            id: "error",
            label: "Error",
            mappedTo: "error",
            disabledWhen: stored("error"),
          },
        ],
        reports: [],
      },
      {
        hooks: {
          beforeValidate: () => {
            throw new Error("Validation unavailable");
          },
        },
      },
    );
    await expect(form.validate()).rejects.toThrow("Validation unavailable");
    expect(form.state.submissionStatus).toBe("idle");
    expect(form.getField("error")!.state.disabled).toBe(true);
    form.reset();
    expect(form.getField("error")!.state.disabled).toBe(false);
    form.dispose();
  });

  test.each([undefined, "unknown", [], ["submitting", "unknown"]])(
    "rejects invalid stored status %j",
    (equals) => {
      expect(
        validateMlformSchema({ fields: [{ ...field, disabledWhen: stored(equals) }], reports: [] })
          .success,
      ).toBe(false);
    },
  );

  test("editor JSON Schema describes stored status conditions as well as current operations", () => {
    const schema = JSON.stringify(createMlformJsonSchema());
    expect(schema).toContain('"form-status"');
    expect(schema).toContain('"form-operation"');
    expect(schema).toContain('"submission-status"');
  });
});
