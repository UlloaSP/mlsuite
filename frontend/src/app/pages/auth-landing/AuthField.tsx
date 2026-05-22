/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InputHTMLAttributes } from "react";

export function AuthField({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <input
      aria-label={label}
      className={`w-full min-w-0 border-0 border-b border-dashed border-[#999] bg-transparent px-1 py-0.5 text-xl font-medium italic text-[#111] outline-none transition [font-family:'Space_Grotesk',sans-serif] placeholder:italic placeholder:text-[#bbb] focus:border-solid focus:border-[#ff385c] dark:text-[#f5f5f5] dark:placeholder:text-[#6f7882] sm:w-auto sm:min-w-36 xl:text-[28px] 2xl:text-[32px] ${className}`}
      {...props}
    />
  );
}
