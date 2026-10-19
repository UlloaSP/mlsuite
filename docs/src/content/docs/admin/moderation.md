---
title: Moderation and API traffic
description: Review and unpublish public bookmarks across the instance, watch API client traffic, suspend clients and set organizations' monthly limits.
---

## Moderation

**Moderation** lists every bookmark published on the instance: its organization, schema,
snapshot and last update, with a **Public page** button. Search by bookmark, schema or
organization, and sort by latest updated, name or organization. A public bookmark whose schema was
archived shows **Schema archived**; its page is not available.

**Unpublish** makes a bookmark private at once. Nothing is deleted, the action is recorded in the
organization's audit log, and members who may publish can make it public again.

## API traffic

**API traffic** shows the calls of every organization's [API clients](/api/clients/): counts,
outcomes and latency, never their content.

**Overview**
: The [usage panel](/api/usage/#overview) for the whole instance, with an **Organizations** tile
  counting the organizations whose clients called and the calls turned away because the runtime was
  busy.

**Clients**
: Every client, filterable by Active or Suspended, with its organization, key count, last
  successful call and calls and errors over 7 days.

  - **Suspend…** refuses every call of the client at once and keeps its organization from giving
    it keys or bookmarks. A reason of up to 400 characters is required; the organization reads it
    on the client's page.
  - **Reinstate** lets its keys work again.

**Organizations**
: Each organization with clients, its calls this month against its limit, and whether that limit
  is its own or the instance default. **Set monthly limit…** sets the number of succeeded calls its
  clients may make together per calendar month (UTC), or **Follow the instance default**. A limit
  of 0 refuses every call.

Suspensions, reinstatements and limits are recorded in the organization's audit log.
