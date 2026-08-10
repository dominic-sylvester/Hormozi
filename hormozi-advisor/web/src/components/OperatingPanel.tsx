import { useEffect, useState } from "react";

import {
  buildCompleteActionItemMessage,
  fetchOperatingDashboard,
  type OperatingDashboardResponse,
} from "../lib/operating-dashboard";

type OperatingPanelProps = {
  companyId: string;
  disabled: boolean;
  onSendMessage: (message: string) => Promise<void>;
};

export function OperatingPanel({ companyId, disabled, onSendMessage }: OperatingPanelProps) {
  const [dashboard, setDashboard] = useState<OperatingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function refresh(nextCompanyId = companyId) {
    setLoading(true);
    const data = await fetchOperatingDashboard(nextCompanyId);
    setDashboard(data);
    setLoading(false);
  }

  useEffect(() => {
    void refresh(companyId);
  }, [companyId]);

  return (
    <section className="ops-panel" aria-label="Operating dashboard">
      <div className="ops-panel-header">
        <div>
          <p className="eyebrow">Operating layer</p>
          <h2>Action inbox & calendar</h2>
        </div>
        <div className="ops-panel-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={disabled || loading}
            onClick={() => void refresh(companyId)}
          >
            Refresh
          </button>
          <button type="button" className="ghost-button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <div className="ops-panel-body">
          <div className="ops-stats">
            <span>Open {dashboard?.counts.open ?? 0}</span>
            <span>In progress {dashboard?.counts.inProgress ?? 0}</span>
            <span>Blocked {dashboard?.counts.blocked ?? 0}</span>
            <span>Done {dashboard?.counts.done ?? 0}</span>
          </div>

          <div className="ops-columns">
            <div className="ops-column">
              <h3>Open action items</h3>
              {dashboard?.openActionItems.length ? (
                <ul className="ops-list">
                  {dashboard.openActionItems.map((item) => (
                    <li key={item.id} className="ops-list-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {item.owner} · {item.priority}
                          {item.department ? ` · ${item.department}` : ""}
                          {item.dueAt ? ` · due ${item.dueAt}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={disabled}
                        onClick={() => void onSendMessage(buildCompleteActionItemMessage(item.id, item.title))}
                      >
                        Complete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ops-empty">No open action items yet. Run a review or launch workflow to populate.</p>
              )}
            </div>

            <div className="ops-column">
              <h3>Calendar rhythms</h3>
              {dashboard?.upcomingEvents.length ? (
                <ul className="ops-list">
                  {dashboard.upcomingEvents.map((event) => (
                    <li key={event.id} className="ops-list-item">
                      <div>
                        <strong>{event.title}</strong>
                        <p>
                          {event.cadence}
                          {event.cron ? ` · ${event.cron}` : ""}
                          {event.department ? ` · ${event.department}` : ""}
                          {event.workflowSkill ? ` · ${event.workflowSkill}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ops-empty">Default calendar seeds on first agent read.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
