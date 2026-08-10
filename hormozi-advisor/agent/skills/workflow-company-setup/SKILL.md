---
description: Use when onboarding a new company, the profile is empty, or the user wants to set up ICP, offer, metrics, and goals before other work.
---

# Workflow: Company Setup

Run at the start of a new session when `companyName` or `offer` is empty.

## Path A — Website URL provided

When the user shares a company website (or the UI sends a URL):

1. Call `research_company_from_url` with the URL
2. Present the **draft profile** as a bullet summary — label every field as inferred until confirmed
3. Ask the user to confirm or correct offer, ICP, promise, price point, and channel
4. Ask only for gaps the website cannot answer: weekly metrics and top 3 goals
5. Call `update_company_profile` with **confirmed** fields plus `websiteUrl`, `researchNotes`, and `researchSources`
6. Do not persist unverified research output without user confirmation

## Path B — No URL (manual interview)

Ask in 2–3 small batches, not one wall of questions:

1. Company name, core offer, and promise
2. ICP / avatar and primary acquisition channel
3. Price point, current weekly metrics, and top 3 goals

After each batch, call `update_company_profile` with confirmed fields.

## Finish (both paths)

1. Call `get_company_profile` and show a concise summary
2. Recommend the first workflow: launch offer, lead gen audit, or weekly review
3. Do not delegate to departments until offer and avatar are set
