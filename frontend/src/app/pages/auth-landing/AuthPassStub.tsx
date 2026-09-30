/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { greetingFor, type AuthMode } from "./authLandingCopy";
import { useMinuteClock } from "./useMinuteClock";

const pad = (value: number) => String(value).padStart(2, "0");

export function AuthPassStub({ mode }: { mode: AuthMode }) {
  const now = useMinuteClock();
  const greeting = greetingFor(mode, now);
  const date = now
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

  return (
    <div className="auth-glass">
      <div aria-hidden="true" className="auth-slot" />
      <div className="flex items-center justify-between">
        <img
          alt=""
          aria-hidden="true"
          className="h-[26px] w-auto"
          height="635"
          src="/mlsuite.png"
          width="1181"
        />
        <div className="auth-mono flex flex-col items-end gap-1 text-3xs tracking-[0.25em]">
          <span>ACCESS PASS</span>
          <time dateTime={`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`}>
            {date}
          </time>
        </div>
      </div>
      <time
        dateTime={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
        className="text-[88px] leading-[0.82] tracking-[-0.06em]"
      >
        <span className="font-extrabold">{pad(now.getHours())}</span>
        <span className="font-thin text-accent">:</span>
        <span className="font-thin">{pad(now.getMinutes())}</span>
      </time>
      <h1 id="auth-title" className="text-3xl tracking-[-0.03em]">
        <span className="font-extralight">{greeting.lead} </span>
        <span className="font-extrabold">{greeting.emphasis}</span>
      </h1>
    </div>
  );
}
