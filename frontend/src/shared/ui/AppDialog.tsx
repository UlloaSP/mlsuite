/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { FormEventHandler, ReactNode } from "react";
import { AppIconButton } from "./AppIconButton";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

const WIDTHS = {
  sm: "w-[min(calc(100vw-2rem),26rem)]",
  md: "w-[min(calc(100vw-2rem),36rem)]",
  lg: "w-[min(calc(100vw-2rem),52rem)]",
  xl: "w-[min(calc(100vw-2rem),64rem)]",
} as const;

/**
 * The one modal surface. Radix owns focus trapping, Escape, outside clicks, and
 * labelling; this fixes the look: overlay, radius, header with close button,
 * scrolling body, and an optional footer that stays in view.
 */
export function AppDialog({
  bodyClassName,
  busy = false,
  children,
  description,
  flush = false,
  footer,
  onClose,
  onSubmit,
  open,
  size = "sm",
  title,
  variant = "modal",
}: {
  bodyClassName?: string;
  /** Blocks dismissal while an action is running. */
  busy?: boolean;
  children?: ReactNode;
  description?: ReactNode;
  /** Body without inner padding, for content that runs edge to edge (split panes). */
  flush?: boolean;
  footer?: ReactNode;
  onClose: () => void;
  /** Makes body and footer one form, so the footer's submit button submits it. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  open: boolean;
  size?: keyof typeof WIDTHS;
  title: ReactNode;
  /** A sheet slides in from the right edge for longer editing tasks. */
  variant?: "modal" | "sheet";
}) {
  const body = (
    <>
      {children ? (
        <div
          className={cx(
            "app-scroll min-h-0 flex-1 overflow-y-auto",
            flush ? "border-t border-line" : "px-6 pb-5",
            bodyClassName,
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
          {footer}
        </div>
      ) : null}
    </>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next && !busy ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="app-dialog-overlay fixed inset-0 z-(--z-overlay) bg-overlay backdrop-blur-sm" />
        <Dialog.Content
          data-variant={variant}
          // Without a description, opt out of Radix's describedby wiring explicitly.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cx(
            "app-dialog fixed z-(--z-modal) flex flex-col rounded-dialog border border-line bg-surface-raised text-fg shadow-overlay outline-none",
            variant === "sheet"
              ? "inset-y-4 right-4 w-[min(calc(100vw-2rem),35rem)]"
              : cx(
                  "left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2",
                  WIDTHS[size],
                ),
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.01em] text-fg">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm leading-6 text-fg-secondary">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild disabled={busy}>
              <AppIconButton aria-label="Close" className={cx("-mr-2 -mt-1 size-9", FOCUS_RING)}>
                <X size={17} />
              </AppIconButton>
            </Dialog.Close>
          </div>
          {onSubmit ? (
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              {body}
            </form>
          ) : (
            body
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
