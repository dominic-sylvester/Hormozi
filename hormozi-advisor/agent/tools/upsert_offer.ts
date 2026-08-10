import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  persistAndSyncCompanyProfile,
  upsertOfferInProfile,
} from "../lib/company-profile-service.js";
import {
  companyProfile,
  slugifyId,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const metricsSchema = z
  .object({
    leadsWeekly: z.number().nullable().optional(),
    adSpendWeekly: z.number().nullable().optional(),
    cpl: z.number().nullable().optional(),
    showRate: z.number().nullable().optional(),
    closeRate: z.number().nullable().optional(),
    churnRate: z.number().nullable().optional(),
  })
  .strict();

const upsertOfferSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    promise: z.string().optional(),
    pricePoint: z.string().optional(),
    channel: z.string().optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    targetAvatarIds: z.array(z.string()).optional(),
    metrics: metricsSchema.optional(),
  })
  .strict();

export default defineTool({
  description: "Create or update one offer in the company offers catalog.",
  inputSchema: upsertOfferSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => upsertOfferInProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    const id = slugifyId(input.id ?? input.name);
    return profile.offers.find((offer) => offer.id === id) ?? profile.offers.at(-1);
  },
});
