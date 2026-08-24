export type SchemaRunCreationPhase = "idle" | "running" | "unsaved" | "saved";

type SaveAction = {
  disabled: boolean;
  label: string;
  loading: boolean;
};

export const getSchemaRunSaveAction = (
  phase: SchemaRunCreationPhase,
  reportsPending: boolean,
  isSaving: boolean,
  hasName: boolean,
): SaveAction => {
  if (isSaving) return { disabled: true, label: "Saving inference...", loading: true };
  if (phase === "running") {
    return { disabled: true, label: "Running inference...", loading: true };
  }
  if (phase === "saved") return { disabled: true, label: "Inference saved", loading: false };
  if (phase === "idle") return { disabled: true, label: "Run inference first", loading: false };
  if (reportsPending) {
    return { disabled: true, label: "Waiting for reports...", loading: true };
  }
  if (!hasName) return { disabled: true, label: "Name inference first", loading: false };
  return { disabled: false, label: "Save inference", loading: false };
};
