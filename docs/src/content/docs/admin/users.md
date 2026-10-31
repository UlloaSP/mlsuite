---
title: Organizations and users
description: What a superadmin can do, and the Organizations and Users administration pages.
---

A **superadmin** administers the whole instance. The first one is created from the
`MLSUITE_SUPERADMIN_*` settings when the API starts (see
[configuration](/self-hosting/configuration/#superadmin)); others are promoted on the Users page.

A superadmin:

- acts as Owner in every organization, without being a member, and sees every organization in the
  switcher;
- sees the **Administration** group: Organizations, Users, Moderation, API traffic, Audit log and Infra;
- has invitations accepted on the spot.

Other accounts that open these pages get "Not found".

## Organizations

**Organizations** lists every organization with its counts of models, schemas, plugins,
inferences and members; personal accounts are not organizations and are not listed. Search by name, slug or description; sort by latest updated, latest
created or name. Each organization's menu offers **Edit name**, **Edit slug**, **Edit
description**, **Transfer owner** and **Delete**; deletion succeeds only for an
[empty organization](/organizations/overview/#settings).

**New organization** creates one:

| Field | Rule |
| --- | --- |
| Name | Required, up to 150 characters. |
| Handle | Filled from the name until edited; up to 39 characters, unique among users and organizations. |
| Owner | Any account; defaults to you. |
| Description | Optional, up to 600 characters. |

The new organization gets the built-in [roles](/organizations/roles/).

## Users

**Users** lists every account with its system role (User or Superadmin), whether it is enabled,
and when it was created. Search by name or email, filter by role, and sort by name, newest or
oldest.

**New user** creates an account with an email, full name, username, password (10 to 128 characters)
and role. It is enabled at once and owns its personal account.

Each user's menu offers:

| Action | Effect |
| --- | --- |
| Change password | Set a new password. This is how users who forgot theirs get back in. The account's open sessions end. |
| Change role | Make the account a User or a Superadmin. The account's open sessions end, so it signs in again with the new role. |
| Disable user / Enable user | A disabled account cannot sign in, and its open sessions end on their next request. |
| Delete | Remove the account, if nothing else refers to it. Accounts that created models, runs or other records cannot be deleted; disable them instead. |

The last enabled superadmin cannot be demoted, disabled or deleted.
