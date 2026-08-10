---
description: Use when reading or updating the shared company profile, briefing departments, or aligning work to ICP, offer, metrics, and goals.
metadata:
  kind: company-state
---

# Shared Company Profile

One canonical profile drives the whole company. Profiles persist in the `content/company-profiles` content collection (JSON + markdown per tenant/user) and hydrate into session state on startup.

## Tools (CEO only)

- `get_company_profile` — read current profile (hydrates from the content collection)
- `update_company_profile` — merge partial updates and persist to the collection
- `research_company_from_url` — fetch public pages and infer a draft profile for onboarding

The synced markdown mirror lives at `/workspace/company/profile.md` in the sandbox.

## Required fields

| Field | Purpose |
| --- | --- |
| `companyName` | Business name |
| `websiteUrl` | Public company website used for research |
| `offer` | Core offer being sold |
| `avatar` | ICP / dream customer |
| `promise` | Transformation promised |
| `pricePoint` | Primary price or range |
| `channel` | Main acquisition channel |
| `researchNotes` | Summary of inferred research (draft until confirmed) |
| `researchSources` | Pages fetched during onboarding research |
| `metrics` | Weekly operating metrics |
| `goals` | Current company priorities |

## Briefing departments

When delegating to `growth`, `monetization`, `sales`, `success`, or `brand`, include:

1. Relevant profile fields (offer, avatar, metrics, goals)
2. The specific outcome you want back
3. Constraints (budget, timeline, tone)

Department heads cannot read the profile tools directly — your brief is their source of truth.

See `references/profile-schema.md` for the full schema.
