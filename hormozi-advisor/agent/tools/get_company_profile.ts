import { defineTool } from "eve/tools";
import { z } from "zod";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import {
  companyProfile,
  formatActiveContextBrief,
  getActiveAvatar,
  getActiveOffer,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description:
    "Read the shared company profile including offers catalog, avatars catalog, and active session context.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    await hydrateCompanyProfile(scope);
    const profile = companyProfile.get();
    return {
      ...profile,
      activeOffer: getActiveOffer(profile),
      activeAvatar: getActiveAvatar(profile),
      activeContextBrief: formatActiveContextBrief(profile),
    };
  },
});
