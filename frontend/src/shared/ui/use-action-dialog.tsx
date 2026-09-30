/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { ActionDialog, type ActionDialogOptions } from "./ActionDialog";

type Request = { options: ActionDialogOptions; resolve: (answer: string | true | null) => void };

/**
 * Promise-based replacements for window.confirm and window.prompt that render an
 * AppDialog. Render `dialog` once in the component that calls them.
 */
export function useActionDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const ask = (options: ActionDialogOptions) =>
    new Promise<string | true | null>((resolve) => setRequest({ options, resolve }));

  return {
    confirm: async (options: Omit<ActionDialogOptions, "input">) => (await ask(options)) === true,
    prompt: async (
      options: ActionDialogOptions & { input: NonNullable<ActionDialogOptions["input"]> },
    ) => {
      const answer = await ask(options);
      return typeof answer === "string" ? answer : null;
    },
    dialog: request ? (
      <ActionDialog
        options={request.options}
        onResolve={(answer) => {
          setRequest(null);
          request.resolve(answer);
        }}
      />
    ) : null,
  };
}
