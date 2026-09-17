/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function AuthHero() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-4 sm:gap-5 lg:gap-[clamp(1rem,3dvh,1.5rem)]">
        <img
          aria-hidden="true"
          alt=""
          className="pointer-events-none w-40 shrink-0 select-none object-contain opacity-90 drop-shadow-[0_22px_20px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)] sm:w-48 lg:w-[clamp(13rem,38dvh,20rem)] xl:w-[clamp(13rem,38dvh,23rem)] 2xl:w-[clamp(13rem,38dvh,26rem)]"
          height="500"
          src="/nightly.mlsuite.png"
          width="500"
        />
        <h1
          id="auth-title"
          aria-label="ML Suite"
          className="flex items-baseline gap-[0.08em] text-[3.5rem] leading-none tracking-[-0.055em] text-[var(--text-primary)] sm:text-[4.25rem] lg:text-[clamp(4rem,10dvh,5rem)] xl:text-[clamp(4rem,10dvh,5.75rem)] 2xl:text-[clamp(4rem,10dvh,6.5rem)]"
        >
          <span aria-hidden="true" className="font-extrabold">
            ML
          </span>
          <span aria-hidden="true" className="font-light">
            suite
          </span>
        </h1>
      </div>
    </div>
  );
}
