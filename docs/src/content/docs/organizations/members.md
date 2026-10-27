---
title: Members and invitations
description: Invite existing accounts into an organization, accept or decline invitations, change members' roles and remove them.
---

People join an organization by invitation. MLsuite sends no email: the invited person finds the
invitation under **Notifications** when they sign in. Only accounts that already exist on the
instance can be invited, so ask the person to [create an account](/start/account/) first.

## Invite someone

Open **Invitations** from the organization switcher (needs **View invitations** or **Invite
members**).

1. Under **Invite member**, search for the account by name or email. Only enabled accounts that are
   not yet members are listed.
2. Choose its starting role. It defaults to **Member**; **Owner** is offered only to members who
   may transfer ownership.
3. Choose **Send invite**.

An invitation is valid for **7 days**. An invitation sent by a superadmin is accepted on the spot.

The list below the form can be searched by email and filtered by status: Pending, Accepted,
Expired or Revoked. Members with **Manage invitations** can act on each invitation:

| Action | Effect |
| --- | --- |
| Resend | Makes the invitation pending again for another 7 days. Not offered for accepted invitations. |
| Revoke | Cancels the invitation. Tick several and choose **Bulk revoke** to cancel them together. |

## Accept or decline

Pending invitations appear in **Notifications** (the account menu shows how many) with
**Accept** and **Decline**. Only the account whose email was invited can answer an invitation, and
an expired or already answered invitation can be neither accepted nor declined. After accepting,
the organization becomes your current one.

## Members

Open **Members** from the switcher (needs **View members**). Search by name or email and filter by
role. Each row shows the member's name, email, role and status.

- **Change role** picks another role for the member. It needs **Manage member roles**, and is not
  offered on your own row or on the Owner's; the Owner role is never offered here, use
  [transfer ownership](/organizations/overview/#settings) instead.
- **Remove** in the row's menu needs **Remove members** as well. It applies at once, without a
  confirmation.

Rows you cannot change show **Read only**.
