/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import { themeWithHtmlAtom } from "./appearance-state";
import "./app-toaster.css";

/**
 * The app's one toast region, in the scheme in effect and with the app's surfaces and icons
 * (app-toaster.css maps Sonner's palette onto the theme's tokens). It sits in the bottom corner,
 * clear of page headers and their actions, and above every dialog: a modal turns off pointer
 * events on the page, which the region takes back so a toast shown over a dialog can still be
 * read, hovered and closed.
 */
export function AppToaster() {
  const theme = useSelector(themeWithHtmlAtom);
  return (
    <Toaster
      className="app-toaster"
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
    />
  );
}
