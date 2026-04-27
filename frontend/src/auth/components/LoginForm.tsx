/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { Link } from "react-router";
import { AppButton, AppCopy, AppPanel, AppTextField } from "../../app/components";
import { useLogin } from "../hooks";

export function LoginForm() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AppPanel className="w-full max-w-md space-y-5">
      <div className="space-y-2">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">
          Sign in
        </h1>
        <AppCopy>Use your MLSuite account and keep tenant context in one session.</AppCopy>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate({ email: email.trim(), password });
        }}
      >
        <AppTextField
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full"
        />
        <AppTextField
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full"
        />
        <AppButton type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Sign in"}
        </AppButton>
      </form>
      <AppCopy>
        Need account?{" "}
        <Link className="font-semibold text-[var(--accent-primary)]" to="/register">
          Create one
        </Link>
      </AppCopy>
    </AppPanel>
  );
}
