/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import { themeWithHtmlAtom } from "./appearance-state";

/**
 * The app's one toast region, in the scheme in effect and with the app's surfaces and icons. It
 * sits in the bottom corner, clear of page headers and their actions, and above every dialog:
 * a modal turns off pointer events on the page, which the region takes back so a toast shown
 * over a dialog can still be read, hovered and closed.
 */
export function AppToaster() {
  const theme = useSelector(themeWithHtmlAtom);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      style={{ pointerEvents: "auto" }}
      icons={{
        success: <CircleCheck size={16} className="text-success" aria-hidden="true" />,
        info: <Info size={16} className="text-info" aria-hidden="true" />,
        warning: <TriangleAlert size={16} className="text-warning" aria-hidden="true" />,
        error: <CircleAlert size={16} className="text-danger" aria-hidden="true" />,
        loading: (
          <LoaderCircle
            size={16}
            className="animate-spin text-fg-muted motion-reduce:animate-none"
            aria-hidden="true"
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-line bg-surface-raised text-fg shadow-overlay",
          title: "text-sm font-medium",
          description: "text-sm text-fg-secondary",
          actionButton: "rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent",
          cancelButton: "rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-fg",
          closeButton: "border-line bg-surface-raised text-fg",
        },
      }}
    />
  );
}
