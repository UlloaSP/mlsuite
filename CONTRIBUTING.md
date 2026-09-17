# Contributing to MLSuite

MLSuite is early software. Small, focused fixes are easiest to review. Discuss large features and contract changes before investing in implementation.

## Where to start

- Report reproducible bugs with the [bug form](https://github.com/UlloaSP/mlsuite/issues/new?template=bug_report.yml).
- Propose features in [Ideas](https://github.com/UlloaSP/mlsuite/discussions/categories/ideas).
- Ask usage and setup questions in [Q&A](https://github.com/UlloaSP/mlsuite/discussions/categories/q-a).
- Report vulnerabilities privately according to [SECURITY.md](./SECURITY.md).

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development

Read [README.md](./README.md) for setup and [AGENTS.md](./AGENTS.md) for repository conventions. Frontend architecture and design decisions live in [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md) and [DESIGN.md](./DESIGN.md).

Use a feature branch based on the current `develop` branch. Pull requests for normal work target `develop`; promotion from `develop` to `main` is a separate maintainer action.

Keep each change focused. Update tests with behavior or contract changes, run the narrowest relevant checks first, and state exactly what was and was not verified.

## Pull requests

A useful pull request explains:

- the concrete problem;
- why the chosen change belongs at that layer;
- affected contracts or persisted data;
- exact verification results;
- before/after evidence when requested visual behavior changes.

Do not include credentials, private model data, generated QA assets, implementation plans, lesson logs, or unrelated refactors.

Opening a pull request does not guarantee acceptance. Maintainers may ask for a smaller scope, a different owner for the behavior, or further evidence.
