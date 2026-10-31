/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState, type FormEvent } from "react";
import { useChangePassword } from "@/features/user/api/profile-api";
import { requestFailure } from "@/features/user/lib/request-failure";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextField } from "@/shared/ui/AppTextField";

const NOTHING = { current: "", next: "", repeated: "" };

/** A new password, given the current one. This device stays signed in; every other one does not. */
export function ProfilePasswordForm() {
  const [fields, setFields] = useState(NOTHING);
  const change = useChangePassword();
  const mismatch = fields.repeated !== "" && fields.repeated !== fields.next;
  const field = (key: keyof typeof NOTHING) => ({
    value: fields[key],
    onChange: (event: { target: { value: string } }) => {
      change.reset();
      setFields((current) => ({ ...current, [key]: event.target.value }));
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mismatch) return;
    change.mutate(
      { currentPassword: fields.current, newPassword: fields.next },
      { onSuccess: () => setFields(NOTHING) },
    );
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div>
        <h2 className="text-xl font-semibold text-fg">Password</h2>
        <AppCopy className="mt-1">
          Changing it signs you out everywhere else. You stay signed in here.
        </AppCopy>
      </div>
      <AppFieldLabel label="Current password">
        <AppTextField
          required
          type="password"
          maxLength={128}
          autoComplete="current-password"
          {...field("current")}
        />
      </AppFieldLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        <AppFieldLabel label="New password">
          <AppTextField
            required
            type="password"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            {...field("next")}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Repeat new password">
          <AppTextField
            required
            type="password"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            {...field("repeated")}
          />
        </AppFieldLabel>
      </div>
      {mismatch ? <AppInlineAlert>The new passwords do not match.</AppInlineAlert> : null}
      {change.isError ? <AppInlineAlert>{requestFailure(change.error)}</AppInlineAlert> : null}
      {change.isSuccess ? (
        <p role="status" className="text-sm text-success-fg">
          Password changed.
        </p>
      ) : null}
      <AppButton
        className="justify-self-start"
        type="submit"
        disabled={change.isPending || mismatch}
      >
        {change.isPending ? <AppSpinner /> : null}
        {change.isPending ? "Changing…" : "Change password"}
      </AppButton>
    </form>
  );
}
