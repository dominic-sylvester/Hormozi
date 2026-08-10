---
description: Use when the user wants to create, edit, or document a standard operating procedure (SOP) for recurring company work.
---

# Workflow: SOP Authoring

Use when the user wants to build or refine an SOP — manually, from a template, or by interviewing them about a recurring process.

## Prerequisites

1. Call `list_sops` to show existing SOPs and avoid duplicates
2. Optionally call `get_sop` if editing an existing SOP by id

## Interview flow (new SOP)

Ask in batches:

1. **Name & trigger** — What is this SOP called? When does it run? (e.g. "After weekly review", "When a new client signs")
2. **Department owner** — Which function owns it? (`ceo`, `growth`, `monetization`, `sales`, `success`, `brand`, or `user`)
3. **Outcome** — One sentence: what does "done" look like?
4. **Steps** — For each step collect:
   - Title (verb-first)
   - Instruction (what to do)
   - Owner role (`user`, department head, or `ceo`)
   - Optional checklist items
   - Optional estimated minutes
5. **Linked skills** — Any playbook or workflow skills this SOP supports? (optional)

Present a draft summary before persisting. Only call `upsert_sop` after the user confirms.

## Edit flow

1. Load the SOP with `get_sop`
2. Ask what to change (name, steps, owner roles, status)
3. Persist with `upsert_sop` after confirmation

## From template

When the user picks a template (e.g. `weekly-review-synthesis`, `launch-offer-checklist`):

1. Load it with `get_sop` or read from `list_sops`
2. Ask which fields to customize for their business
3. Save as a new id if they want a variant, or update in place if they own the original

## After saving

1. Offer to `spawn_action_items_from_sop` for a test run
2. Suggest linking to the operating calendar via `upsert_calendar_event` if this is a recurring rhythm
3. Point the user to the SOP library in the web UI for direct edits

## Persistence rules

- Minimum 1 step per SOP
- Use `status: "draft"` until the user approves, then set `"active"`
- Step `order` must be sequential starting at 1
