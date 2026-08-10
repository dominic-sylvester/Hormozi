import { defineTool } from "eve/tools";
import { z } from "zod";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { companyProfile } from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Read the shared company profile used across all departments.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    await hydrateCompanyProfile(scope);
    return companyProfile.get();
  },
});
