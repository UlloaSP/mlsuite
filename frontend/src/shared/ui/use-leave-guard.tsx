/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useBlocker } from "@tanstack/react-router";
import { useActionDialog } from "./use-action-dialog";

/**
 * Asks before leaving loses edits that are not saved: in the app with a dialog, and on a reload
 * or closed tab with the browser's own warning. `what` names the edits ("Your profile changes").
 * Render the returned dialog once in the component that holds the edits.
 */
export function useLeaveGuard(dirty: boolean, what: string) {
  const { confirm, dialog } = useActionDialog();
  useBlocker({
    disabled: !dirty,
    enableBeforeUnload: dirty,
    shouldBlockFn: async () =>
      !(await confirm({
        title: "Leave without saving?",
        description: `${what} are not saved yet and are lost if you leave.`,
        confirmLabel: "Leave",
        danger: true,
      })),
  });
  return dialog;
}
