/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

/** 0 idle, 1 pass torn while the request runs, 2 overlay revealed after success. */
export type AuthPhase = 0 | 1 | 2;
export type AuthReveal = { x: number; y: number; radius: number };

const TEAR_MS = 650;
// Overlay content fades in at .45s and the progress bar finishes at .6s + 2.4s.
const WELCOME_MS = 3000;
const REDUCED_WELCOME_MS = 1000;

export function useAuthAccess(destination: string) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<AuthPhase>(0);
  const [reveal, setReveal] = useState<AuthReveal>({ x: 0, y: 0, radius: 1600 });
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  };
  const afterTear = (callback: () => void) =>
    later(
      callback,
      reduceMotion ? 0 : Math.max(0, TEAR_MS - (performance.now() - startedAt.current)),
    );

  const start = (pass: HTMLElement | null) => {
    const box = pass?.getBoundingClientRect();
    const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
    const y = box ? box.top + box.height / 2 : window.innerHeight / 2;
    const farthest = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    setReveal({ x, y, radius: Math.max(1600, Math.ceil(farthest)) });
    startedAt.current = performance.now();
    setPhase(1);
  };

  const succeed = () =>
    afterTear(() => {
      setPhase(2);
      later(
        () => void navigate(destination, { replace: true }),
        reduceMotion ? REDUCED_WELCOME_MS : WELCOME_MS,
      );
    });

  const fail = () => afterTear(() => setPhase(0));

  return { phase, reveal, start, succeed, fail };
}
