import { defineTool } from "eve/tools";
import { z } from "zod";

import { getOperatingDashboard } from "../lib/operating-dashboard-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description:
    "Return the operating dashboard: open action items, calendar rhythms, SOPs, and status counts.",
  inputSchema: z.object({}).strict(),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return getOperatingDashboard(scope);
  },
});
