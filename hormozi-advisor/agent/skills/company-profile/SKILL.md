---
description: Use when reading or updating the shared company profile, briefing departments, or aligning work to ICP, offer, metrics, and goals.
metadata:
  kind: company-state
---

# Shared Company Profile

Layered company state persists in `content/company-profiles` and hydrates on session start.

## Tools (CEO only)

| Tool | Layer |
| --- | --- |
| `get_company_profile` | Read full profile + active context |
| `get_company_catalog` | Read companies list + catalogs (UI sync) |
| `update_company_profile` | Company identity, research, goals, company metrics |
| `upsert_offer` | Offers catalog |
| `upsert_avatar` | Avatars / ICP catalog |
| `set_active_context` | Active offer + avatar for this session |
| `list_companies` / `create_company` / `select_company` | Multi-company |
| `research_company_from_url` | URL onboarding research |

## Briefing departments

Always include `activeContextBrief` from `get_company_profile`:

1. Active offer name, promise, price, channel
2. Active avatar / ICP description
3. The specific outcome you want back
4. Constraints (budget, timeline, tone)

Department heads cannot read profile tools directly — your brief is their source of truth.

See `references/profile-schema.md` for the full schema.
