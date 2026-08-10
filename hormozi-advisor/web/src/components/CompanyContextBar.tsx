import { useEffect, useState } from "react";

import {
  buildSelectCompanyMessage,
  buildSetActiveContextMessage,
  fetchCompanyCatalog,
  type CompanyCatalogResponse,
} from "../lib/company-catalog";

type CompanyContextBarProps = {
  disabled: boolean;
  onSendMessage: (message: string) => Promise<void>;
};

export function CompanyContextBar({ disabled, onSendMessage }: CompanyContextBarProps) {
  const [catalog, setCatalog] = useState<CompanyCatalogResponse | null>(null);
  const [companyId, setCompanyId] = useState("default");
  const [offerId, setOfferId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function refreshCatalog(nextCompanyId = companyId) {
    setLoading(true);
    const data = await fetchCompanyCatalog(nextCompanyId);
    setCatalog(data);
    if (data) {
      setCompanyId(data.companyId);
      setOfferId(data.active.offerId ?? data.offers[0]?.id ?? "");
      setAvatarId(data.active.avatarId ?? data.avatars[0]?.id ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    void refreshCatalog("default");
  }, []);

  async function onCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    await onSendMessage(buildSelectCompanyMessage(nextCompanyId));
    await refreshCatalog(nextCompanyId);
  }

  async function applyActiveContext() {
    await onSendMessage(
      buildSetActiveContextMessage({
        companyId,
        offerId: offerId || null,
        avatarId: avatarId || null,
      }),
    );
    await refreshCatalog(companyId);
  }

  return (
    <section className="context-bar" aria-label="Company context">
      <div className="context-bar-row">
        <label>
          Company
          <select
            value={companyId}
            disabled={disabled || loading}
            onChange={(event) => void onCompanyChange(event.target.value)}
          >
            {(catalog?.companies.length ? catalog.companies : [{ companyId: "default", companyName: "Default company", websiteUrl: "", offerCount: 0, avatarCount: 0 }]).map(
              (company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.companyName || company.companyId}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Offer
          <select
            value={offerId}
            disabled={disabled || loading}
            onChange={(event) => setOfferId(event.target.value)}
          >
            <option value="">Select offer</option>
            {catalog?.offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Avatar
          <select
            value={avatarId}
            disabled={disabled || loading}
            onChange={(event) => setAvatarId(event.target.value)}
          >
            <option value="">Select avatar</option>
            {catalog?.avatars.map((avatar) => (
              <option key={avatar.id} value={avatar.id}>
                {avatar.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="context-bar-actions">
        <button type="button" className="ghost-button" disabled={disabled || loading} onClick={() => void refreshCatalog(companyId)}>
          Refresh catalog
        </button>
        <button type="button" className="secondary-button" disabled={disabled || loading || !offerId} onClick={() => void applyActiveContext()}>
          Apply active context
        </button>
      </div>
    </section>
  );
}
