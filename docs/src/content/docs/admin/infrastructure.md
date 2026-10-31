---
title: Infrastructure
description: "The superadmin dashboard of a self-hosted stack: service health and metrics, start, stop and restart, live logs, an embedded terminal and alerts on the platform's load."
---

**Infra** shows the Docker Compose services of the instance through the operations agent, a small
service that reads `docker compose` from the host. It exists on self-hosted stacks that run the
`ops-agent` service; see [Run with Docker Compose](/self-hosting/docker-compose/).

| Tab | What it offers |
| --- | --- |
| Overview | CPU, memory, disk and network I/O over the last 15 minutes to 24 hours, for all services or one, and how many services are healthy. |
| Services | Each managed service with its state, health, uptime, CPU, memory and ports. **Start** a stopped service, **Stop** or **Restart** a running one, after a confirmation. |
| Logs | A live tail of one service's logs, searchable, filtered by level (INFO, WARN, ERROR, DEBUG). **Pause** and **Follow** the stream, or **Export** it as a text file. |
| Terminal | An interactive shell inside a service. |
| Alerts | What the platform warned about its own load: open and resolved alerts with their times and values, every signal's current value and thresholds, and the services that need attention right now. |

Stopping or restarting a service interrupts it and may disconnect users, including this page.

The managed services default to `postgres`, `py-analyzer`, `runtime-builder`, `rustfs`, `spring-app` and `frontend`
(`OPS_AGENT_MANAGED_SERVICES`). The terminal is **off** until services are listed in
`OPS_AGENT_TERMINAL_SERVICES`; anything typed there can change files and stop services. Idle
shells close after 15 minutes. See the [ops agent settings](/self-hosting/configuration/#operations-agent).

## Load alerts

The API reads these signals every 15 seconds. They need no extra service: no Prometheus, no
Alertmanager.

| Signal | What it reads | Warning / critical / clears under |
| --- | --- | --- |
| Prediction rows waiting | Rows of bulk uploads not yet run | 20,000 / 100,000 / 10,000 |
| Oldest open bulk upload | Age of the oldest queued or running job | 15 min / 1 h / 5 min |
| Models waiting for preparation | Models still preparing | 10 / 50 / 3 |
| Runs waiting for the runtime | Runs queued across the workspace, public and client shares | 100 / 500 / 20 |
| Runs turned away by the runtime | `503` answers from those shares, per minute | 10 / 120 / 1 |
| Storage deletions that failed | Deletions that used up their attempts | 1 / 50 / 1 |
| CPU, memory, disk | Share of the machine in use, from the ops agent | 85% / 95% / 70% (disk clears under 80%) |
| Ops agent not reporting | The agent cannot be reached, or cannot measure the stack | Warning only |

An alert raises once its condition has held for 2 minutes, and resolves once the value has stayed
under its clear threshold for 5 minutes, so a value hovering around a threshold raises once and
stays open. A warning that reaches its critical threshold for 2 minutes becomes critical and stays
so until it resolves. Each raise, escalation and resolution sends one notification to every enabled
superadmin and adds one entry to the [audit log](/organizations/audit-log/); the **Infra** entry in
the navigation counts the open alerts. Resolved alerts are kept 30 days.

While the ops agent is not reporting, CPU, memory and disk are **unknown**, not zero: the page says
so, alerts on them neither raise nor resolve, and they take a full clear period to resolve once it
is back. The application keeps working and keeps starting without the agent; only **Infra**'s other
tabs need it. CPU counts the services the agent manages against the machine's cores; memory and disk are
those of the machine Docker runs on.

Failed storage deletions are not retried. Their alert stays open until the failed rows in
`storage_deletion_task` are dealt with: once storage is healthy, set them back to `PENDING`, or
delete them if the objects are gone.

With more than one API instance every instance evaluates, and the database keeps one alert open per
signal, so nothing is raised or reported twice. The two runtime signals are counted per instance:
an alert raised by one stays open as long as any instance sees the condition, and the **Signals**
table shows the instance that answered.

Every threshold is a setting; see [Alerts](/self-hosting/configuration/#alerts).
