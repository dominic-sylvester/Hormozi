---
description: Use when reading or updating the shared company profile, briefing departments, or aligning work to ICP, offer, metrics, and goals.
metadata:
  kind: company-state
---

# Shared Company Profile

One canonical profile drives the whole company. When `DATABASE_URL` is set, the profile persists in Postgres across sessions for the authenticated tenant/user.

## Tools (CEO only)

- `get_company_profile` — read current profile (hydrates from Postgres when configured)
- `update_company_profile` — merge partial updates and persist

The synced markdown mirror lives at `/workspace/company/profile.md` in the sandbox.

## Required fields

| Field | Purpose |
| --- | --- |
| `companyName` | Business name |
| `offer` | Core offer being sold |
| `avatar` | ICP / dream customer |
| `promise` | Transformation promised |
| `pricePoint` | Primary price or range |
| `channel` | Main acquisition channel |
| `metrics` | Weekly operating metrics |
| `goals` | Current company priorities |

## Briefing departments

When delegating to `growth`, `monetization`, `sales`, `success`, or `brand`, include:

1. Relevant profile fields (offer, avatar, metrics, goals)
2. The specific outcome you want back
3. Constraints (budget, timeline, tone)

Department heads cannot read the profile tools directly — your brief is their source of truth.

See `references/profile-schema.md` for the full schema.
