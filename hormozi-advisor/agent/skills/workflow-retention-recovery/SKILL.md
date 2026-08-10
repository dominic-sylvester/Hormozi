---
description: Use when churn is rising, refunds increase, or the user needs a retention and ascension recovery plan.
---

# Workflow: Retention Recovery

## Sequence

1. **success** — diagnose churn, onboarding gaps, and LTV leaks.
2. **monetization** — adjust offer ascension path and pricing where needed.
3. **sales** — update proof and expectations set at sale.
4. **growth** — pause or fix messaging that attracts wrong customers.

## Workflow template

```js
const context = "<churn metrics and context>";
const retention = await tools.success({
  message: `Diagnose retention and LTV issues. Context: ${context}`,
});
const offerPath = await tools.monetization({
  message: `Recommend offer/pricing/ascension fixes: ${retention}`,
});
const proof = await tools.sales({
  message: `Fix proof and expectation-setting from this diagnosis: ${retention}`,
});
const traffic = await tools.growth({
  message: `Adjust acquisition messaging to match fixed offer and proof: ${offerPath}`,
});
return { retention, offerPath, proof, traffic };
```
