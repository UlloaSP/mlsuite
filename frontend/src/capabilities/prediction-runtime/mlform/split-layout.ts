/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * For the element an MLForm with `layout: { kind: "split" }` is mounted in: inputs in one
 * pane and results in the other, each scrolling inside the height the element is given; MLForm
 * stacks the panes itself on narrow screens. Its split layout sizes the inputs pane to its
 * content (~360px), leaving the results pane mostly empty. Its `--mlf-shell-left-min-width`
 * token is declared but unused, so the container gives the pane half the row through the
 * exposed `form-pane` part, still capped by MLForm's own left max width.
 */
export const MLFORM_SPLIT_CONTAINER_CLASS = "[&_mlf-form::part(form-pane)]:min-w-[min(50%,48rem)]";
