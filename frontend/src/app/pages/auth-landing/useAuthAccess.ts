/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMediaQuery } from "@/shared/ui/use-media-query";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { workspaceContextQueryOptions } from "@/capabilities/workspace-context/workspace-context";
import { appHref } from "@/shared/lib/app-href";

/** 0 idle or waiting for the server, 1 pass torn once it accepted, 2 overlay revealed. */
export type AuthPhase = 0 | 1 | 2;
export type AuthReveal = { x: number; y: number; radius: number };

// The welcome takes about two seconds, long enough to read: the tear, then the reveal, whose
// progress bar fills by 1.3s (auth-access-overlay.css), then the destination.
const TEAR_MS = 450;
const WELCOME_MS = 1400;
// Without motion the welcome cross-fades in 0.2s and stays a moment to be read.
const REDUCED_WELCOME_MS = 700;

/**
 * Plays the welcome only for an attempt the server accepted, then opens the destination. While it
 * plays, the destination's page and data load, and so does the workspace the app's frame waits
 * for; the welcome stays up until they have, so its last frame is followed by the app itself.
 */
export function useAuthAccess(destination: string) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [phase, setPhase] = useState<AuthPhase>(0);
  const [reveal, setReveal] = useState<AuthReveal>({ x: 0, y: 0, radius: 1600 });
  const timers = useRef<number[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    const pending = timers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const later = (callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  };

  const succeed = (pass: HTMLElement | null) => {
    // A failure here is the destination's to show once it opens; the welcome only waits.
    const ready = Promise.allSettled([
      queryClient.prefetchQuery(workspaceContextQueryOptions()),
      router.preloadRoute(appHref(destination)),
    ]);
    const open = () =>
      void ready.then(() => {
        if (mounted.current) void navigate({ href: destination, replace: true });
      });
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
