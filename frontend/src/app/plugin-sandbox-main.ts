/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { config } from "zod";
import { startPluginSandbox } from "@/capabilities/prediction-runtime/sandbox/sandbox-guest";
import "./plugin-sandbox.css";

// The sandbox's CSP allows no eval; without this, Zod's probe for it is reported as a violation.
config({ jitless: true });

startPluginSandbox(document.getElementById("sandbox-root")!);
