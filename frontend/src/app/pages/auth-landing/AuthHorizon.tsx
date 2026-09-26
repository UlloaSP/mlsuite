/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";

export function AuthHorizon() {
  return (
    <>
      <div aria-hidden="true" className="auth-horizon-glow" />
      <div aria-hidden="true" className="auth-horizon" />
      <div className="auth-horizon-logo" role="img" aria-label="MLsuite">
        <img alt="" height="635" src="/mlsuite.png" width="1181" />
        <MLSuiteWordmark />
      </div>
    </>
  );
}
