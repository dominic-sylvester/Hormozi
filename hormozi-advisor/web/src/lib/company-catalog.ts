export type CatalogOffer = {
  id: string;
  name: string;
  status: string;
};

export type CatalogAvatar = {
  id: string;
  name: string;
  status: string;
};

export type CompanyCatalogCompany = {
  companyId: string;
  companyName: string;
  websiteUrl: string;
  offerCount: number;
  avatarCount: number;
};

export type CompanyCatalogResponse = {
  companyId: string;
  companies: CompanyCatalogCompany[];
  offers: CatalogOffer[];
  avatars: CatalogAvatar[];
  active: {
    offerId: string | null;
    avatarId: string | null;
  };
};

export async function fetchCompanyCatalog(companyId = "default"): Promise<CompanyCatalogResponse | null> {
  try {
    const response = await fetch(`/api/company-catalog?companyId=${encodeURIComponent(companyId)}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CompanyCatalogResponse;
  } catch {
    return null;
  }
}

export function buildSetActiveContextMessage(input: {
  companyId: string;
  offerId: string | null;
  avatarId: string | null;
}): string {
  return `Set active context to company "${input.companyId}", offer "${input.offerId ?? "none"}", avatar "${input.avatarId ?? "none"}". Confirm when applied.`;
}

export function buildSelectCompanyMessage(companyId: string): string {
  return `Switch to company "${companyId}" and load its profile catalog.`;
}
