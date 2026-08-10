---
description: Use when onboarding a new company, the profile is empty, or the user wants to set up ICP, offer, metrics, and goals before other work.
---

# Workflow: Company Setup

Run at the start of a new session when `companyName` or `offer` is empty.

## Interview (batch questions)

Ask in 2–3 small batches, not one wall of questions:

1. Company name, core offer, and promise
2. ICP / avatar and primary acquisition channel
3. Price point, current weekly metrics, and top 3 goals

## Persist

After each batch, call `update_company_profile` with confirmed fields.

## Finish

1. Call `get_company_profile` and show a concise summary
2. Recommend the first workflow: launch offer, lead gen audit, or weekly review
3. Do not delegate to departments until offer and avatar are set
