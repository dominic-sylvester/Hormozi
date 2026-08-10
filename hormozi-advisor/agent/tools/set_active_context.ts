import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  persistAndSyncCompanyProfile,
  setActiveContextInProfile,
} from "../lib/company-profile-service.js";
import {
  companyProfile,
  formatActiveContextBrief,
  getActiveAvatar,
  getActiveOffer,
} from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const setActiveSchema = z
  .object({
    offerId: z.string().nullable().optional(),
    avatarId: z.string().nullable().optional(),
  })
  .strict();

export default defineTool({
  description:
    "Set the active offer and/or avatar for this session. Workflows and department briefs use this context.",
  inputSchema: setActiveSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => setActiveContextInProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    return {
      active: profile.active,
      activeOffer: getActiveOffer(profile),
      activeAvatar: getActiveAvatar(profile),
      activeContextBrief: formatActiveContextBrief(profile),
    };
  },
});
