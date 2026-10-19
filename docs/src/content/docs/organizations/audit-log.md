---
title: Audit log
description: Read who changed invitations, roles and API access in an organization, and what platform administrators did to its resources.
---

The audit log keeps a line for each change to an organization's invitations, roles and API access.
Open **Audit log** from the organization switcher. It needs **View audit log**, which Owner and
Admin have by default; give it to a [custom role](/organizations/roles/#custom-roles) to let
others read the log. When a role loses the permission, the entry leaves its members' switcher
and the log is refused to them.

## What is recorded

Each entry shows what was done, who did it, when, the kind of thing it was done to with its id,
and the details recorded with it, such as the invitation's email or the role's name. Nothing in
MLsuite edits or deletes an entry.

| Area | Actions |
| --- | --- |
| Invitations | Invitation sent, resent and revoked. |
| Roles | Role created, created from a template, duplicated, updated and deleted. |
| API access | API client created, updated and deleted; API key issued and revoked; bookmark access granted and revoked. |
| Platform | API client suspended and reinstated, monthly API call limit set, bookmark unpublished by moderation. |

Platform entries are marked **Platform**: a platform administrator took them from the
[administration pages](/admin/moderation/) on the organization's resources, and is named as the
person who acted even when they are not a member.

## Find an entry

The newest entries come first and more load as you scroll. Search by the person who acted, the
target's id or the recorded details, and filter by one action. Both are kept in the page address,
so a filtered log can be shared as a link.
