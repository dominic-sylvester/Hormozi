import { defineTool } from "eve/tools";
import { z } from "zod";

import { listCalendarEvents } from "../lib/calendar-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "List enabled operating calendar events for the active company.",
  inputSchema: z.object({}).strict(),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return listCalendarEvents(scope);
  },
});
