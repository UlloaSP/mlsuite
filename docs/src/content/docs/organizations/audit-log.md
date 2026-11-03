---
title: Audit log
description: Read who did what and when in an organization, across the platform, and how long it is kept.
---

The audit log keeps a line for every action taken in an organization: by its members, its API
clients, visitors on its public pages, platform administrators, and the system's own background
work. Open **Audit log** from the organization switcher. It needs **View audit log**, which Owner
and Admin have by default; give it to a [custom role](/organizations/roles/#custom-roles) to let
others read the log. When a role loses the permission, the entry leaves its members' switcher
and the log is refused to them.

## What is recorded

Each entry shows what was done, who did it, when, the kind of thing it was done to with its id,
where the request came from, and what changed, such as a model's old and new name or a member's old
and new role. Reading is not recorded: opening a catalog or filtering inferences leaves no entry,
and neither does switching organization.

| Area | Actions |
| --- | --- |
| Organization | Created, updated, deleted; logo replaced and removed; member role changed, member removed, ownership transferred. |
| Invitations | Sent, resent, revoked, accepted and declined. |
| Roles | Created, created from a template, duplicated, updated and deleted. |
| API access | API client created, updated and deleted; API key issued and revoked; bookmark access granted and revoked. |
| Models | Uploaded, renamed, archived, restored, duplicated, deleted and explained; environment retried; preparation ready or failed. |
| Schemas | Created, renamed, archived, restored, duplicated and deleted; snapshot created; draft created, updated, merged and published. |
| Bookmarks | Created, moved, updated, published and unpublished; run marked and unmarked as an example. |
| Predictions | Every run, whoever made it; saved, saved in a batch and deleted; bulk upload started, cancelled, retried, picked up and finished. |
| Reviews | Created; feedback given and changed; submitted, pending reviews submitted, reopened, response deleted; feedback given on a public page. |
| Plugins | Uploaded and deleted. |
| Platform | API client suspended and reinstated, monthly API call limit set, bookmark unpublished by moderation. |
| System | A failed storage deletion, once it has run out of attempts. |

A bulk upload leaves one entry per action, never one per row. The inputs and outputs of a
prediction are never recorded, and neither are feedback answers, passwords or API keys.

Platform entries are marked **Platform**: a platform administrator took them from the
[administration pages](/admin/moderation/) on the organization's resources, and is named as the
person who acted even when they are not a member.

An entry names who acted as they were at the time, and stays when they go: a deleted account or
organization keeps its name in the entries about it, and neither is blocked from deletion by them.
People appear by name, API clients by the client's name, and work the platform does on its own as
**System**. Someone on a public page without an account is a **Public visitor**: an organization
does not see their address, only the platform's administrators do. An account signed in on a
public page appears under its own name.

## Find an entry

The newest entries come first and more load as you scroll. Search by who acted, the target's id or
the recorded details, and filter by action, kind of actor, part of the actor's name, kind of target
and a period of days. All of it is kept in the page address, so a filtered log can be shared as a
link.

## Across the platform

Superadmins read **Audit log** under platform administration: every organization's entries together
with the events that belong to none of them, which are sign-ins, failed sign-ins, sign-outs,
registrations, changes to users, actions on infrastructure services, terminal sessions opened and
closed, and the retention jobs' reports. Filter it to one organization, or to **Platform events**
alone. Terminal keystrokes are never recorded. A failed sign-in names the email that was tried, and
stops being recorded once that network has used up its attempts.

## How long entries are kept

Entries are kept for 7 days, then removed by a job that runs every hour and records how many it
removed. Nothing else in MLsuite edits or deletes an entry. Operators change the period with
[`AUDIT_RETENTION_DAYS`](/self-hosting/configuration/#public-runs-and-the-client-api).
