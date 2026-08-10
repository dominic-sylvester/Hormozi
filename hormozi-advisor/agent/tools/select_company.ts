import { defineTool } from "eve/tools";
import { z } from "zod";

import { hydrateCompanyProfile, persistAndSyncCompanyProfile } from "../lib/company-profile-service.js";
import {
  companyProfile,
  formatActiveContextBrief,
  getActiveAvatar,
  getActiveOffer,
  scopeCompanyId,
  slugifyId,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const selectCompanySchema = z
  .object({
    companyId: z.string().min(1),
  })
  .strict();

export default defineTool({
  description: "Switch the active company context for this session and hydrate its profile.",
  inputSchema: selectCompanySchema,
  async execute(input, ctx) {
    const companyId = slugifyId(input.companyId);
    scopeCompanyId.update(() => companyId);
    const scope = resolveCompanyScope(ctx);
    await hydrateCompanyProfile(scope);
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);

    return {
      companyId,
      profile,
      activeOffer: getActiveOffer(profile),
      activeAvatar: getActiveAvatar(profile),
      activeContextBrief: formatActiveContextBrief(profile),
    };
  },
});
