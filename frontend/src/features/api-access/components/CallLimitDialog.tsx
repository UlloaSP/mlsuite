/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextField } from "@/shared/ui/AppTextField";
import type { AdminApiOrganizationDto } from "@/shared/api/openapi.gen";

type Props = {
  organization: AdminApiOrganizationDto;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  /** Null returns the organization to the instance default. */
  onConfirm: (monthlyCalls: number | null) => void;
};

/** An organization's own monthly limit of succeeded calls, or the instance default. */
export function CallLimitDialog({ organization, pending, error, onCancel, onConfirm }: Props) {
  const [useDefault, setUseDefault] = useState(!organization.customLimit);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (useDefault) return onConfirm(null);
    const value = Number(new FormData(event.currentTarget).get("monthlyCalls"));
    if (Number.isInteger(value) && value >= 0) onConfirm(value);
  };

  return (
    <AppDialog
      open
      busy={pending}
      error={error}
      onClose={onCancel}
      title={`Monthly limit of ${organization.name}`}
      description="Succeeded calls its clients may make together in a calendar month (UTC). Past it, calls are refused with 429 until the month ends. The change is kept in the organization's audit log."
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={pending}>
            {pending ? <AppSpinner size={16} /> : <Save size={16} />}
            Save limit
          </AppButton>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="flex items-center gap-2 text-sm text-fg">
          <AppCheckbox checked={useDefault} onChange={() => setUseDefault((value) => !value)} />
          Follow the instance default
        </label>
        <div className="grid gap-2">
          <label htmlFor="monthly-calls" className="text-sm font-semibold text-fg">
            Calls a month
          </label>
          <AppTextField
            id="monthly-calls"
            name="monthlyCalls"
            type="number"
            min={0}
            step={1}
            disabled={useDefault}
            defaultValue={organization.monthlyLimit}
            required={!useDefault}
          />
          <p className="text-xs leading-5 text-fg-muted">0 refuses every call.</p>
        </div>
      </div>
    </AppDialog>
  );
}
