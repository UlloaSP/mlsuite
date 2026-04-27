/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { Link } from "react-router";
import { AppButton, AppCopy, AppPanel, AppTextField } from "../../app/components";
import { useRegister } from "../hooks";

export function RegisterForm() {
  const register = useRegister();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <AppPanel className="w-full max-w-md space-y-5">
      <div className="space-y-2">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">
          Create account
        </h1>
        <AppCopy>Your personal organization will be created automatically.</AppCopy>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
          }
          setError(null);
          register.mutate({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            username: username.trim(),
          });
        }}
      >
        <AppTextField
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Full name"
          className="w-full"
        />
        <AppTextField
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          className="w-full"
        />
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
        <AppTextField
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          className="w-full"
        />
        {error ? <AppCopy className="text-[var(--danger-text)]">{error}</AppCopy> : null}
        <AppButton type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending ? "Creating..." : "Create account"}
        </AppButton>
      </form>
      <AppCopy>
        Already have account?{" "}
        <Link className="font-semibold text-[var(--accent-primary)]" to="/login">
          Sign in
        </Link>
      </AppCopy>
    </AppPanel>
  );
}
