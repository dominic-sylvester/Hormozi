import { defineTool } from "eve/tools";
import { z } from "zod";

import { ensureDefaultCalendar } from "../lib/calendar-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Seed default operating calendar rhythms from templates when the calendar is empty.",
  inputSchema: z.object({}).strict(),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    const store = await ensureDefaultCalendar(scope);
    return store.events;
  },
});
