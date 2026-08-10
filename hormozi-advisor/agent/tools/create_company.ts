import { defineTool } from "eve/tools";
import { z } from "zod";

import { getCompanyProfileCollection } from "../lib/company-profile-collection.js";
import { hydrateCompanyProfile, persistAndSyncCompanyProfile } from "../lib/company-profile-service.js";
import {
  companyProfile,
  emptyCompanyProfile,
  scopeCompanyId,
  slugifyId,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const createCompanySchema = z
  .object({
    companyId: z.string().min(1),
    companyName: z.string().min(1),
    websiteUrl: z.string().optional(),
  })
  .strict();

export default defineTool({
  description: "Create a new company profile bucket for this user.",
  inputSchema: createCompanySchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    const companyId = slugifyId(input.companyId);
    const targetScope = { ...scope, companyId };
    const existing = await getCompanyProfileCollection().get(targetScope);
    if (existing) {
      throw new Error(`Company already exists: ${companyId}`);
    }

    const profile = emptyCompanyProfile();
    profile.companyName = input.companyName;
    profile.websiteUrl = input.websiteUrl ?? "";
    profile.updatedAt = new Date().toISOString();

    await getCompanyProfileCollection().put(targetScope, profile);
    scopeCompanyId.update(() => companyId);
    companyProfile.update(() => profile);
    await persistAndSyncCompanyProfile(targetScope, profile, ctx);

    return { companyId, companyName: profile.companyName };
  },
});
