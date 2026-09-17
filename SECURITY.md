# Security policy

## Supported versions

MLSuite is pre-1.0 software. Security fixes target the current `main` branch and the newest immutable build release. Older builds do not receive backports.

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

Python model formats such as Pickle and Joblib may execute code while loading. MLSuite currently treats model uploaders as trusted authors; arbitrary untrusted model execution is not a supported security boundary. Reports about authorization bypasses, unintended upload access, sandbox escapes, or execution beyond the documented trust model are still in scope.
