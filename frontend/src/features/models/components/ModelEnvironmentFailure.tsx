/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRetryModelEnvironmentMutation } from "@/features/models/api/model.mutations";
import { AppButton } from "@/shared/ui/AppButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import type { ModelDto } from "@/shared/api/openapi.gen";

type Props = {
  model: Pick<ModelDto, "id" | "runtimeError">;
  /** Preparing again follows the edit-models permission, like archiving. */
  canRetry: boolean;
};

/** Why a model cannot run, with the way to have its environment prepared again. */
export function ModelEnvironmentFailure({ model, canRetry }: Props) {
  // A refusal is reported by the global mutation error handler.
  const retry = useRetryModelEnvironmentMutation();

  return (
    <div className="flex flex-wrap items-start gap-3">
      <AppInlineAlert className="min-w-0 flex-1">
        <span className="font-semibold">The model cannot run: its environment failed.</span>
        {model.runtimeError ? ` ${model.runtimeError}` : null}
      </AppInlineAlert>
      {canRetry ? (
        <AppButton
          type="button"
          variant="secondary"
          disabled={retry.isPending}
          onClick={() =>
            retry.mutate(model.id, {
              onSuccess: () => toast.success("Preparing the model's environment again."),
            })
          }
        >
          {retry.isPending ? <AppSpinner size={14} /> : <RotateCcw size={16} />}
          Prepare again
        </AppButton>
      ) : null}
    </div>
  );
}
