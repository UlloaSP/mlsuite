import { describe, expect, test } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";

const lockedWhileRunning = { kind: "form-operation", equals: "submitting" };
const age = { id: "age", kind: "number", label: "Age", mappedTo: "age", required: true };
const schemaWith = (field: Record<string, unknown>) => ({ fields: [field], reports: [] });

describe("fields a run leaves out while inactive", () => {
  test.each([
    ["disabledWhen", lockedWhileRunning],
    ["hiddenWhen", lockedWhileRunning],
    ["disabled", true],
    ["hidden", true],
  ])("flags a mapped field with %s that would be omitted from runs", (key, value) => {
    const result = validateMlformSchema(schemaWith({ ...age, [key]: value }));
    expect(result.success).toBe(false);
    expect(result.issues).toContainEqual({
      path: ["fields", 0, "inactiveFieldPolicy"],
      message:
        'Schema field 1 is left out of runs while hidden or disabled, so its model input would be missing. Set "inactiveFieldPolicy": "include" to submit its value.',
      severity: "error",
    });
  });

  test.each(["omit", "reset-on-hide"])("flags an explicit %s policy", (policy) => {
    const field = { ...age, disabledWhen: lockedWhileRunning, inactiveFieldPolicy: policy };
    expect(validateMlformSchema(schemaWith(field)).success).toBe(false);
  });

  test("accepts an always-active field", () => {
    expect(validateMlformSchema(schemaWith(age))).toMatchObject({ success: true, issues: [] });
  });

  test("submits a field disabled while running when it asks to be included", async () => {
    const schema = schemaWith({
      ...age,
      disabledWhen: lockedWhileRunning,
      inactiveFieldPolicy: "include",
    });
    expect(validateMlformSchema(schema).success).toBe(true);
    const runtime = createSchemaRunRuntime({ schema, bindings: [] });
    const submitted: Record<string, unknown>[] = [];
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: {
        submit: async (request) => {
          submitted.push({ ...request.modelValues });
          return { reports: [] };
        },
      },
    });
    form.getField("age")!.setValue(42);
    await form.submit();
    expect(submitted).toEqual([{ age: 42 }]);
    form.dispose();
  });
});
