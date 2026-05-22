/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function MLSuiteMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#ff385c" />
      <circle cx="14" cy="18" r="3" fill="white" opacity=".9" />
      <circle cx="14" cy="30" r="3" fill="white" opacity=".9" />
      <circle cx="24" cy="12" r="3" fill="white" />
      <circle cx="24" cy="24" r="3" fill="white" />
      <circle cx="24" cy="36" r="3" fill="white" />
      <circle cx="34" cy="18" r="3" fill="white" opacity=".9" />
      <circle cx="34" cy="30" r="3" fill="white" opacity=".9" />
      <path
        d="M14 18 24 12m-10 6 10 6m-10 6 10-6m-10 6 10 6m0-24 10 6m-10 6 10-6m-10 6 10 6m-10 6 10-6"
        stroke="white"
        strokeWidth="1.2"
        opacity=".5"
      />
    </svg>
  );
}
