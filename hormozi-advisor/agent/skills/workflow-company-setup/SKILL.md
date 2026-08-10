---
description: Use when onboarding a new company, the profile is empty, or the user wants to set up ICP, offer, metrics, and goals before other work.
---

# Workflow: Company Setup

Run when `companyName` is empty or the offers catalog has no active entries.

## Path A — Website URL provided

1. Call `research_company_from_url`
2. Present inferred **offers catalog** and **avatars catalog** as draft tables
3. Ask the user to confirm, rename, add, or remove entries
4. Persist with:
   - `update_company_profile` for company identity + research notes
   - `upsert_offer` for each confirmed offer
   - `upsert_avatar` for each confirmed avatar
5. Call `set_active_context` with the primary offer + avatar the user chooses
6. Ask only for company-level gaps: weekly metrics and top 3 goals

## Path B — Manual interview

Ask in 2–3 batches:

1. Company name, website, brand promise
2. First offer (name, promise, price, channel) and primary ICP
3. Additional offers/avatars if mentioned; company metrics and goals

After each batch, upsert offers/avatars and update company fields.

## Finish (both paths)

1. Call `get_company_profile` and summarize company + active context
2. Recommend first workflow (`workflow-launch-offer`, lead gen audit, or weekly review)
3. Do not delegate until active offer and avatar are set
