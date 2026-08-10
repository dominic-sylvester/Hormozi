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
