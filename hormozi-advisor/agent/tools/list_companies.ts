import { defineTool } from "eve/tools";
import { z } from "zod";

import { getCompanyProfileCollection } from "../lib/company-profile-collection.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "List all companies saved for the current user.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return getCompanyProfileCollection().list(scope);
  },
});
