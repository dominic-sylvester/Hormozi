import { defineTool } from "eve/tools";
import { z } from "zod";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { getCompanyProfileCollection } from "../lib/company-profile-collection.js";
import {
  companyProfile,
  formatActiveContextBrief,
  getActiveAvatar,
  getActiveOffer,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description:
    "Return companies for this user plus the active company's offers, avatars, and active context. Used by the web UI catalog sync.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    await hydrateCompanyProfile(scope);
    const profile = companyProfile.get();
    const companies = await getCompanyProfileCollection().list(scope);

    return {
      companyId: scope.companyId,
      companies,
      profile,
      offers: profile.offers,
      avatars: profile.avatars,
      active: profile.active,
      activeOffer: getActiveOffer(profile),
      activeAvatar: getActiveAvatar(profile),
      activeContextBrief: formatActiveContextBrief(profile),
    };
  },
});
