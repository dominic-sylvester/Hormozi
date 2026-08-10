import { defineHook } from "eve/hooks";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const scope = resolveCompanyScope(ctx);
      await hydrateCompanyProfile(scope);
    },
  },
});
