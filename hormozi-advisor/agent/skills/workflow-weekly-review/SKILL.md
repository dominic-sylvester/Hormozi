---
description: Use for weekly operating reviews across growth, monetization, sales, and retention metrics.
---

# Workflow: Weekly Operating Review

## Parallel department reviews

1. **growth** — pipeline, CPL, hook/ad performance, nurture conversion.
2. **monetization** — revenue, ARPU, offer mix, pricing tests.
3. **sales** — close rate, proof gaps, objection patterns.
4. **success** — churn, retention, LTV expansion.

## Workflow template

```js
const week = "<week label and metrics>";
const [growth, monetization, salesReview, success] = await Promise.all([
  tools.growth({ message: `Weekly growth review for ${week}` }),
  tools.monetization({ message: `Weekly monetization review for ${week}` }),
  tools.sales({ message: `Weekly sales review for ${week}` }),
  tools.success({ message: `Weekly retention and LTV review for ${week}` }),
]);
return { growth, monetization, salesReview, success };
```

CEO synthesizes into priorities for next week.

## After the workflow

1. Call `get_operating_dashboard` to see open work.
2. Spawn follow-ups with `spawn_action_items_from_sop` using `weekly-review-synthesis`, or `create_action_items` for custom priorities.
3. Assign each priority an owner department and due date when the user provides a timeline.
