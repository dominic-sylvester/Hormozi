---
description: Use when launching a new offer, product, or campaign that needs offer design, proof, hooks, and a go-to-market plan.
---

# Workflow: Launch Offer

Run with the `Workflow` tool when the user wants to launch or relaunch an offer.

## Prerequisites

1. Call `get_company_profile`
2. Ensure `active.offerId` is set via `set_active_context`
3. If the user names a different offer, set active context before continuing
4. Include `activeContextBrief` in every department message

## Sequence

1. **monetization** — design the grand slam offer, pricing, and money model for the **active offer**.
2. **brand** — align positioning and brand promise with the active offer + avatar.
3. **sales** — build proof checklist and closing talk track.
4. **growth** — create hooks, ad angles, and lead nurture path for the active avatar.

## Workflow template

```js
const context = "<paste activeContextBrief>";
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

## After the workflow

1. Spawn launch follow-ups with `spawn_action_items_from_sop` using `launch-offer-checklist`.
2. Add custom action items for anything the user must personally approve or ship.
3. Confirm the action inbox with `get_operating_dashboard`.
