import type { EditorErrorCard } from "@/features/schemas/lib/schema-diagnostics";

export function buildCatalogWarning(error: unknown, required: boolean): EditorErrorCard {
  return {
    line: 1,
    column: 1,
    path: "catalog",
    message:
      error instanceof Error
        ? `Custom plugin catalog could not be loaded: ${error.message}`
        : `Custom plugin catalog could not be loaded: ${String(error)}`,
    severity: required ? "error" : "warning",
  };
}
