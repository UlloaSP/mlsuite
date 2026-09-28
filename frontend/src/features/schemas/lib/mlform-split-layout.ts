/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * MLForm's split layout sizes the inputs pane to its content (~360px), leaving
 * the results pane mostly empty. Its `--mlf-shell-left-min-width` token is
 * declared but unused, so the container gives the pane half the row through the
 * exposed `form-pane` part, still capped by MLForm's own left max width.
 */
export const MLFORM_SPLIT_CONTAINER_CLASS = "[&_mlf-form::part(form-pane)]:min-w-[min(50%,48rem)]";
