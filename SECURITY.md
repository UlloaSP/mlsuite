# Security policy

## Supported versions

MLsuite is pre-1.0 software. Security fixes target the current `main` branch and the newest immutable build release. Older builds do not receive backports.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/UlloaSP/mlsuite/security/advisories/new). Do not open a public issue or discussion before a fix and disclosure plan are agreed.

Include:

- affected commit or build;
- affected component and deployment mode;
- reproduction steps or proof of concept;
- realistic impact and required privileges;
- suggested mitigation, if known.

Remove unrelated credentials, personal data, and private model inputs. You should receive an acknowledgement within seven days. Timelines for validation, remediation, and disclosure depend on severity and reproducibility.

## Model artifact boundary

MLsuite accepts model artifacts only as `.mlbundle` files and never loads Pickle or Joblib. Bundles are validated and loaded by mlbundle, a pre-alpha library whose security design has had no independent review, and native model parsers and inference run unsandboxed in the runtime. MLsuite therefore still treats model uploaders as trusted authors; arbitrary untrusted model execution is not a supported security boundary. Reports about authorization bypasses, unintended upload access, sandbox escapes, or execution beyond the documented trust model are still in scope.
