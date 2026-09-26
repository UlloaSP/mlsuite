/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
import { appButtonClass, type ButtonSize, type ButtonVariant } from "./button-styles";
import { cx } from "./cx";

export function AppButton({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button {...props} type={type} className={cx(appButtonClass({ size, variant }), className)}>
      {children}
    </button>
  );
}
