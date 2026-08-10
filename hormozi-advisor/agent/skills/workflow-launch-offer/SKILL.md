---
description: Use when launching a new offer, product, or campaign that needs offer design, proof, hooks, and a go-to-market plan.
---

# Workflow: Launch Offer

Run with the `Workflow` tool when the user wants to launch or relaunch an offer.

## Sequence

1. **monetization** — design the grand slam offer, pricing, and money model.
2. **brand** — align positioning and brand promise with the offer.
3. **sales** — build proof checklist and closing talk track.
4. **growth** — create hooks, ad angles, and lead nurture path.

## Workflow template

```js
const context = "<paste user context>";
const offer = await tools.monetization({
  message: `Design the offer stack and pricing. Context: ${context}`,
});
const brand = await tools.brand({
  message: `Align brand promise and positioning to this offer: ${offer}`,
});
const proof = await tools.sales({
  message: `Build proof checklist and closing outline for: ${offer}`,
});
const gtm = await tools.growth({
  message: `Create hooks, ad angles, and nurture plan for: ${offer}. Brand: ${brand}`,
});
return { offer, brand, proof, gtm };
```

Adjust parallel steps only when outputs are independent.
