/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextField } from "@/shared/ui/AppTextField";

/** The API's limit, so a longer name is stopped while it is typed. */
const NAME_MAX_LENGTH = 80;

type Props = {
  name: string;
  pending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Names the consumer a new key is for. */
export function BookmarkApiKeyForm({ name, pending, onNameChange, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="grid min-w-0 flex-1 gap-2">
        <label htmlFor="bookmark-api-key-name" className="text-sm font-semibold text-fg">
          Consumer name
        </label>
        <AppTextField
          id="bookmark-api-key-name"
          name="name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Lab2Pressure"
          maxLength={NAME_MAX_LENGTH}
          required
        />
      </div>
      <AppButton type="submit" disabled={pending || !name.trim()}>
        {pending ? <AppSpinner size={16} /> : <KeyRound size={16} />}
        Create key
      </AppButton>
    </form>
  );
}
