import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  companyProfile,
  formatProfileMarkdown,
  type CompanyMetrics,
  type CompanyProfile,
} from "../lib/company-state.js";

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

function mergeProfile(current: CompanyProfile, patch: z.infer<typeof updateSchema>): CompanyProfile {
  const metrics: CompanyMetrics = {
    ...current.metrics,
    ...(patch.metrics ?? {}),
  };

  return {
    ...current,
    ...patch,
    metrics,
    goals: patch.goals ?? current.goals,
    updatedAt: new Date().toISOString(),
  };
}

export default defineTool({
  description:
    "Update the shared company profile. Partial updates merge into the existing session state and sync to /workspace/company/profile.md.",
  inputSchema: updateSchema,
  async execute(input, ctx) {
    companyProfile.update((current) => mergeProfile(current, input));
    const profile = companyProfile.get();

    try {
      const sandbox = await ctx.getSandbox();
      await sandbox.writeTextFile({
        path: "company/profile.md",
        content: formatProfileMarkdown(profile),
      });
    } catch {
      // Sandbox may be unavailable during discovery or some runtime modes.
    }

    return profile;
  },
});
