import { useId, type ReactNode } from "react";
import { FieldIdContext } from "./field-id";

/**
 * A field's visible label over its control. The label points at the control by id, so the
 * control has exactly this one label and its accessible name is the text shown.
 */
export function AppFieldLabel({ children, label }: { children: ReactNode; label: string }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-fg-secondary">
        {label}
      </label>
      <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>
    </div>
  );
}
