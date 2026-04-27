# Tenant RBAC MVP

## Required Header

All authenticated API requests must send:

`X-Organization-Slug: <slug>`

Frontend behavior:

- Reads slug from `localStorage`
- Sends header through `appFetch`
- Clears stale slug when backend returns tenant-contract `400` or org-access `403`
- Retries `/api/user/profile` once after tenant recovery

## Profile Contract

`GET /api/user/profile` returns:

```json
{
  "id": "7",
  "fullName": "Alice Doe",
  "userName": "alice",
  "email": "alice@example.com",
  "avatarUrl": "https://...",
  "oauthProvider": "github",
  "createdAt": "2026-04-27T10:00:00Z",
  "isSuperadmin": false,
  "activeOrganizationSlug": "acme",
  "activeOrganizationName": "Acme",
  "organizations": [
    {
      "id": "9",
      "name": "Acme",
      "slug": "acme",
      "status": "ACTIVE",
      "roleNames": ["admin"]
    }
  ],
  "permissions": ["models:read", "plugins:manage"]
}
```

## Storage Paths

- Models: `orgs/{orgId}/models/...`
- Plugins: `orgs/{orgId}/plugins/...`

Legacy plugin roots are still read as fallback during migration:

- `custom-fields/...`
- `custom-reports/...`
- `custom-explanations/...`

## Error Contract

- Missing tenant header: `400`
- Missing org membership: `403`
- Missing permission: `403`
- Resource outside active org: `404`

## Rollout Notes

- Existing users get a personal organization slug: `{username}-{userId}`
- Active membership is auto-provisioned
- System roles seeded per org: `owner`, `admin`, `member`
- Frontend sidebar selector is source of active workspace choice
