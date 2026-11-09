/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMediaQuery } from "@/shared/ui/use-media-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

/** 0 idle or waiting for the server, 1 pass torn once it accepted, 2 overlay revealed. */
export type AuthPhase = 0 | 1 | 2;
export type AuthReveal = { x: number; y: number; radius: number };

// The whole welcome stays under a second: the tear, then the reveal, then the destination.
const TEAR_MS = 250;
const WELCOME_MS = 550;
const REDUCED_WELCOME_MS = 300;

/** Plays the welcome only for an attempt the server accepted, then opens the destination. */
export function useAuthAccess(destination: string) {
  const navigate = useNavigate();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [phase, setPhase] = useState<AuthPhase>(0);
  const [reveal, setReveal] = useState<AuthReveal>({ x: 0, y: 0, radius: 1600 });
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  };
  const open = () => void navigate({ href: destination, replace: true });

  const succeed = (pass: HTMLElement | null) => {
    const box = pass?.getBoundingClientRect();
    const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
    const y = box ? box.top + box.height / 2 : window.innerHeight / 2;
    const farthest = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    setReveal({ x, y, radius: Math.max(1600, Math.ceil(farthest)) });
    if (reduceMotion) {
      setPhase(2);
      later(open, REDUCED_WELCOME_MS);
      return;
    }
    setPhase(1);
    later(() => {
      setPhase(2);
      later(open, WELCOME_MS);
    }, TEAR_MS);
  };

  return { phase, reveal, succeed };
}
