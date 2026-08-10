import type { SessionContext } from "eve/context";

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

  return {
    tenantId,
    userId,
    companyId: "default",
  };
}
