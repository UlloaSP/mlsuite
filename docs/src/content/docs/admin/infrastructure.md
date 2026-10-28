---
title: Infrastructure
description: "The superadmin dashboard of a self-hosted stack: service health and metrics, start, stop and restart, live logs, an embedded terminal and alerts."
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
| Alerts | Services that need attention, a degraded live stream or an unavailable shell. |

Stopping or restarting a service interrupts it and may disconnect users, including this page.

The managed services default to `postgres`, `py-analyzer`, `runtime-builder`, `minio`, `spring-app` and `frontend`
(`OPS_AGENT_MANAGED_SERVICES`). The terminal is **off** until services are listed in
`OPS_AGENT_TERMINAL_SERVICES`; anything typed there can change files and stop services. Idle
shells close after 15 minutes. See the [ops agent settings](/self-hosting/configuration/#operations-agent).
