/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { AppButton } from "./AppButton";
import { AppDialog } from "./AppDialog";
import { AppTextField } from "./AppTextField";

export type ActionDialogOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  /** Destructive actions confirm with a danger button. */
  danger?: boolean;
  /** Asks for a value (a name) instead of a plain yes/no. */
  input?: { label: string; defaultValue?: string };
};

/** A confirmation or single-field prompt; resolves with the answer, or null when dismissed. */
export function ActionDialog({
  options,
  onResolve,
}: {
  options: ActionDialogOptions;
  onResolve: (answer: string | true | null) => void;
}) {
  const [value, setValue] = useState(options.input?.defaultValue ?? "");
  const missingValue = Boolean(options.input) && !value.trim();

  return (
    <AppDialog
      open
      onClose={() => onResolve(null)}
      title={options.title}
      description={options.description}
      onSubmit={(event) => {
        event.preventDefault();
        if (!missingValue) onResolve(options.input ? value.trim() : true);
      }}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={() => onResolve(null)}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            variant={options.danger ? "danger" : "primary"}
            disabled={missingValue}
          >
            {options.confirmLabel}
          </AppButton>
        </>
      }
    >
      {options.input ? (
        <AppTextField
          aria-label={options.input.label}
          autoFocus
          required
          className="w-full"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : null}
    </AppDialog>
  );
}
