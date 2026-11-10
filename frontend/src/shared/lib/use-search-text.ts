/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * The text of a search box whose value lives in the URL (`value`). The box answers every key
 * from its own state; `onSettle` writes the text to the URL once typing pauses, and at once when
 * the box is cleared, so the page reads one settled value for its request instead of re-rendering
 * on every key. A box drawn straight from the URL would lag behind typing and drop keys: the
 * router commits a navigation in a React transition, after the keystroke has been drawn.
 *
 * A value the URL gets from anywhere else (back and forward, a link, clearing the filters)
 * replaces the text.
 */
export function useSearchText(value: string, onSettle: (value: string) => void) {
  const [text, setText] = useState(value);
  const settled = useDebouncedValue(text);
  // Values this box wrote that the URL has not shown yet, oldest first.
  const written = useRef<string[]>([]);

  const settle = useEffectEvent((next: string) => {
    if (next === value) return;
    written.current.push(next);
    onSettle(next);
  });

  useEffect(() => settle(settled), [settled]);

  useEffect(() => {
    const own = written.current.indexOf(value);
    if (own >= 0) {
      written.current.splice(0, own + 1);
      return;
    }
    written.current = [];
    setText(value);
  }, [value]);

  return { text, setText };
}
