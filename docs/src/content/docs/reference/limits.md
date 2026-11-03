---
title: Limits
description: Every size, length, count and rate limit in MLsuite in one table, with where to change it.
---

Limits marked *configurable* are defaults that an operator changes in
[`.env`](/self-hosting/configuration/).

## Accounts and organizations

| What | Limit |
| --- | --- |
| Password | 10 to 128 characters |
| Full name | 150 characters |
| Organization name, handle, description | 150, 39, 600 characters |
| Organization logo, profile picture | PNG or JPG, at least 64 × 64 px, up to 2 MB; stored as a 256 px square |
| Profile bio, company, location, website | 280, 100, 100, 255 characters |
| Profile links, pinned bookmarks | 4 links of 255 characters, 6 bookmarks |
| Role name, description | 120, 600 characters |
| Invitation validity | 7 days |
| Failed sign-ins and wrong current passwords | 10 per network in 15 minutes, then `429` until the window ends, *configurable* |
| Registration attempts | 5 per network in 15 minutes, *configurable* |

## Models, schemas and runs

| What | Limit |
| --- | --- |
| Model bundle | 512 MB per file (nginx and the API) |
| Bundle archive | 512 MiB, 100,000 features and 1,024 outputs (MLbundle) |
| Schema name, description | 180, 800 characters |
| Bookmark name, description, publication note | 180, 800, 1000 characters |
| Bulk upload | 10,000 records per CSV or XLSX file; 2 running per member, 4 per organization |
| Column conditions in the Inferences filters | 100 |
| Review expiry | Default 30 days after creation |

## Public pages

| What | Limit |
| --- | --- |
| Model size of a public bookmark | 50 MB, *configurable* |
| Runs of one bookmark in 24 hours | 50 per network address without an account, 500 per signed-in account, *configurable* |
| Public runs at once | 2 on the instance, *configurable* |
| Input value | Null, boolean, number or text of at most 256 characters |
| Request body | 64 KB |

## Client API

| What | Limit |
| --- | --- |
| Client name, description | 80, 400 characters |
| Key name | 80 characters |
| Calls per client | 60 per clock minute, *configurable* |
| Succeeded calls per organization | 10,000 per UTC month, *configurable*, or set per organization by a superadmin |
| API runs at once | 2 on the instance, *configurable* |
| Bookmark | Exactly one bound model, within the public model size limit |
| Feature value | Null, boolean, number or text of at most 256 characters |
| Request log retention | 90 days, at least 31, *configurable* |
| Suspension reason | 400 characters |
