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

MLsuite accepts model artifacts only as `.mlbundle` files and never loads Pickle or Joblib. Bundles are validated and loaded by mlbundle, whose security design has had no independent review, and native model parsers and inference run unsandboxed in the runtime. MLsuite therefore still treats model uploaders as trusted authors; arbitrary untrusted model execution is not a supported security boundary. Reports about authorization bypasses, unintended upload access, sandbox escapes, or execution beyond the documented trust model are still in scope.

## Plugin execution boundary

Plugins (custom MLForm field and report kinds) are TypeScript authored by any organization with **Manage plugins**, and their code runs in every browser that opens a form using them — including visitors of public pages. MLsuite treats plugin code as untrusted and runs it only inside a dedicated sandboxed iframe (`plugin-sandbox.html`) with an opaque origin: no `allow-same-origin`, served with `Content-Security-Policy: sandbox …; connect-src 'none'`. The sandbox therefore has no access to the app's cookies, storage, DOM, or API, and no network of its own. The application document and the sandbox never run plugin code or the TypeScript compiler in the app's origin.

The app is the only party that talks to the API. It passes schemas, plugin sources, and data into the sandbox over a typed, origin-checked, schema-validated `postMessage` channel, and reads back only form values and rendered results; it never passes credentials or tokens. A sandboxed report may ask the app to run one API call — an explanation (`POST /api/analyzer/explanations`) of a model the form already runs — and nothing else. Escapes from this sandbox (reaching the app origin, cookies, storage, the API as the viewer, or other network destinations) are in scope.
