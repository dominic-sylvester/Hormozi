import { defineHook } from "eve/hooks";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { ensureCompanyStoreReady } from "../lib/company-store.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      await ensureCompanyStoreReady();
      const scope = resolveCompanyScope(ctx);
      await hydrateCompanyProfile(scope);
    },
  },
});
