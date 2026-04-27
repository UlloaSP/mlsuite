/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppPage } from "../../app/components";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterPage() {
  return (
    <AppPage className="min-h-dvh items-center justify-center bg-[var(--page-bg)] p-6">
      <div className="flex w-full items-center justify-center">
        <RegisterForm />
      </div>
    </AppPage>
  );
}
