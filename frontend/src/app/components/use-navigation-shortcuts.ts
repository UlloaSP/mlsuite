/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useEffectEvent, useState } from "react";
import { useNavigate } from "react-router";
import { isTypingTarget, shortcutDigit } from "@/app/utils/keyboard-shortcuts";
import type { NavigationChild, NavigationItem } from "./sidebar-navigation-support";

/**
 * Alt+N opens the Nth entry and Alt+Shift+N the Nth child of the current
 * section. Returns whether Alt is held so entries can reveal their numbers.
 */
export function useNavigationShortcuts({
  navigation,
  shortcutChildren,
  showHints,
}: {
  navigation: NavigationItem[];
  shortcutChildren: () => NavigationChild[];
  showHints: boolean;
}) {
  const navigate = useNavigate();
  const [altHeld, setAltHeld] = useState(false);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Alt" && showHints && !isTypingTarget(event.target)) {
      setAltHeld(true);
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) {
      return;
    }

    const digit = shortcutDigit(event);
    if (!digit) return;

    const target = event.shiftKey ? shortcutChildren()[digit - 1] : navigation[digit - 1];
    if (!target) return;

    event.preventDefault();
    void navigate(target.to, { viewTransition: true });
  });

  useEffect(() => {
    const hide = () => setAltHeld(false);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") hide();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return altHeld;
}
