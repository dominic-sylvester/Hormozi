import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  mergeCompanyProfile,
  persistAndSyncCompanyProfile,
} from "../lib/company-profile-service.js";
import { companyProfile } from "../lib/company-state.js";
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

const updateSchema = z
  .object({
    companyName: z.string().optional(),
    offer: z.string().optional(),
    avatar: z.string().optional(),
    promise: z.string().optional(),
    pricePoint: z.string().optional(),
    channel: z.string().optional(),
    metrics: metricsSchema.optional(),
    goals: z.array(z.string()).optional(),
  })
  .strict();

export default defineTool({
  description:
    "Update the shared company profile. Partial updates merge into session state, persist to Postgres when DATABASE_URL is set, and sync to /workspace/company/profile.md.",
  inputSchema: updateSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => mergeCompanyProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    return profile;
  },
});
