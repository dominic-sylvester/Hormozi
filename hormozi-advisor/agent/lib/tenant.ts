import type { SessionContext } from "eve/context";

import { scopeCompanyId } from "./company-state.js";

export interface CompanyScope {
  tenantId: string;
  userId: string;
  companyId: string;
}

export function resolveCompanyScope(ctx: SessionContext): CompanyScope {
  const caller = ctx.session.auth.current ?? ctx.session.auth.initiator;
  const tenantId =
    typeof caller?.attributes?.tenantId === "string"
      ? caller.attributes.tenantId
      : (caller?.principalId ?? "anonymous");
  const userId =
    caller?.principalType === "user" && caller.principalId
      ? caller.principalId
      : tenantId;

  const attributeCompanyId =
    typeof caller?.attributes?.companyId === "string" ? caller.attributes.companyId : null;

  return {
    tenantId,
    userId,
    companyId: attributeCompanyId ?? scopeCompanyId.get() ?? "default",
  };
}
