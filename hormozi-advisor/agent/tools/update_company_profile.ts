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

const researchSourceSchema = z
  .object({
    url: z.string(),
    title: z.string(),
  })
  .strict();

const updateSchema = z
  .object({
    companyName: z.string().optional(),
    websiteUrl: z.string().optional(),
    brandPromise: z.string().optional(),
    researchNotes: z.string().optional(),
    researchSources: z.array(researchSourceSchema).optional(),
    metrics: metricsSchema.optional(),
    goals: z.array(z.string()).optional(),
  })
  .strict();

export default defineTool({
  description:
    "Update company-level profile fields (identity, research notes, company metrics, goals). Use upsert_offer and upsert_avatar for catalog entries.",
  inputSchema: updateSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => mergeCompanyProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    return profile;
  },
});
