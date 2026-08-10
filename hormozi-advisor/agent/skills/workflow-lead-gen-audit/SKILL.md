---
description: Use when auditing lead generation, ads, hooks, nurture, or top-of-funnel performance.
---

# Workflow: Lead Gen Audit

## Sequence

1. **growth** — audit leads, hooks, ads, nurture, and marketing machine.
2. **monetization** — check whether the front-end offer matches traffic quality.
3. **sales** — verify proof and conversion path from lead to sale.

## Workflow template

```js
const context = "<paste metrics and context>";
const funnel = await tools.growth({
  message: `Audit lead gen, hooks, ads, and nurture. Context: ${context}`,
});
const offerFit = await tools.monetization({
  message: `Review offer and pricing fit for this traffic audit: ${funnel}`,
});
const conversion = await tools.sales({
  message: `Review proof and closing path given this audit: ${funnel}. Offer review: ${offerFit}`,
});
return { funnel, offerFit, conversion };
```
