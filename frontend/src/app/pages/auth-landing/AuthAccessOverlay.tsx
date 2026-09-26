/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CSSProperties } from "react";
import type { AuthMode } from "./authLandingCopy";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import type { AuthReveal } from "./useAuthAccess";

export function AuthAccessOverlay({
  mode,
  open,
  reveal,
}: {
  mode: AuthMode;
  open: boolean;
  reveal: AuthReveal;
}) {
  const style = {
    "--auth-reveal-x": `${reveal.x}px`,
    "--auth-reveal-y": `${reveal.y}px`,
    "--auth-reveal-r": `${reveal.radius}px`,
  } as CSSProperties;

  return (
    <div className="auth-overlay" data-open={open} style={style} aria-hidden={!open}>
      <div className="auth-overlay-content" role="status">
        <img alt="" className="h-[72px] w-auto" height="635" src="/mlsuite.png" width="1181" />
        <p className="text-center text-[min(84px,10vw)] leading-[0.92] tracking-[-0.05em]">
          {mode === "login" ? (
            <>
              <span className="font-extralight">Welcome to </span>
              <MLSuiteWordmark suffix="." />
            </>
          ) : (
            <>
              <span className="font-extralight">Account </span>
              <span className="font-extrabold">created.</span>
            </>
          )}
        </p>
        <div className="flex flex-col items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.35em]">
            OPENING WORKSPACE
          </span>
          <div aria-hidden="true" className="auth-overlay-bar">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
