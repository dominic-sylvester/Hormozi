import { FormEvent, useEffect, useState } from "react";

import {
  buildAuthorSopMessage,
  buildSpawnSopMessage,
  fetchSops,
  newSopDraft,
  saveSop,
  type SopRecord,
  type SopStep,
  type SopTemplate,
  type UpsertSopInput,
} from "../lib/sops";

const DEPARTMENTS = ["ceo", "growth", "monetization", "sales", "success", "brand", "user"] as const;
const OWNER_ROLES = ["user", "ceo", "growth", "monetization", "sales", "success", "brand"] as const;
const STATUSES = ["draft", "active", "archived"] as const;

type SopPanelProps = {
  companyId: string;
  disabled: boolean;
  onSendMessage: (message: string) => Promise<void>;
};

export function SopPanel({ companyId, disabled, onSendMessage }: SopPanelProps) {
  const [sops, setSops] = useState<SopRecord[]>([]);
  const [templates, setTemplates] = useState<SopTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<UpsertSopInput>(newSopDraft());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextCompanyId = companyId) {
    setLoading(true);
    setError(null);
    const data = await fetchSops(nextCompanyId);
    if (!data) {
      setError("Could not load SOPs.");
      setLoading(false);
      return;
    }
    setSops(data.sops);
    setTemplates(data.templates);
    const nextSelected = data.sops.find((sop) => sop.id === selectedId) ?? data.sops[0];
    if (nextSelected) {
      setSelectedId(nextSelected.id);
      setDraft(toDraft(nextSelected));
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh(companyId);
  }, [companyId]);

  function selectSop(sop: SopRecord) {
    setSelectedId(sop.id);
    setDraft(toDraft(sop));
    setError(null);
  }

  function startBlank() {
    setSelectedId("");
    setDraft(newSopDraft());
    setError(null);
  }

  function startFromTemplate(templateId: string) {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) {
      return;
    }
    setSelectedId("");
    setDraft(newSopDraft(template));
    setError(null);
  }

  function updateDraft(patch: Partial<UpsertSopInput>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateStep(index: number, patch: Partial<SopStep>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)),
    }));
  }

  function addStep() {
    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          order: current.steps.length + 1,
          title: "",
          instruction: "",
          ownerRole: "user",
          estimatedMinutes: null,
          checklist: [],
        },
      ],
    }));
  }

  function removeStep(index: number) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("SOP name is required.");
      return;
    }
    if (draft.steps.every((step) => !step.title.trim())) {
      setError("Add at least one step with a title.");
      return;
    }

    setSaving(true);
    setError(null);
    const saved = await saveSop(companyId, draft);
    setSaving(false);
    if (!saved) {
      setError("Could not save SOP.");
      return;
    }
    await refresh(companyId);
    setSelectedId(saved.id);
    setDraft(toDraft(saved));
  }

  return (
    <div className="sop-panel">
      <div className="sop-toolbar">
        <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => startBlank()}>
          New SOP
        </button>
        <label className="sop-template-picker">
          From template
          <select
            disabled={disabled || loading || templates.length === 0}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                startFromTemplate(event.target.value);
                event.target.value = "";
              }
            }}
          >
            <option value="">Choose template…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-button" disabled={disabled || loading} onClick={() => void refresh(companyId)}>
          Refresh
        </button>
      </div>

      <div className="sop-layout">
        <aside className="sop-list-pane">
          <h3>SOP library</h3>
          {sops.length ? (
            <ul className="sop-list">
              {sops.map((sop) => (
                <li key={sop.id}>
                  <button
                    type="button"
                    className={`sop-list-button${selectedId === sop.id ? " is-active" : ""}`}
                    disabled={disabled}
                    onClick={() => selectSop(sop)}
                  >
                    <strong>{sop.name}</strong>
                    <span>
                      {sop.department} · {sop.steps.length} steps · {sop.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops-empty">No SOPs yet. Create one or ask the CEO to run workflow-sop-authoring.</p>
          )}
        </aside>

        <form className="sop-editor" onSubmit={(event) => void onSubmit(event)}>
          <div className="sop-editor-header">
            <h3>{selectedId ? "Edit SOP" : "New SOP"}</h3>
            <div className="sop-editor-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={disabled || !draft.id}
                onClick={() => void onSendMessage(buildAuthorSopMessage({ sopId: draft.id || undefined }))}
              >
                Author with CEO
              </button>
              {draft.id ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={disabled}
                  onClick={() => void onSendMessage(buildSpawnSopMessage(draft.id, draft.name || draft.id))}
                >
                  Spawn action items
                </button>
              ) : null}
            </div>
          </div>

          <div className="sop-form-grid">
            <label>
              Name
              <input
                value={draft.name}
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ name: event.target.value })}
              />
            </label>
            <label>
              ID
              <input
                value={draft.id}
                placeholder="auto from name"
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ id: event.target.value })}
              />
            </label>
            <label>
              Department
              <select
                value={draft.department}
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ department: event.target.value })}
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={draft.status}
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ status: event.target.value })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="sop-span-2">
              Trigger
              <input
                value={draft.trigger}
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ trigger: event.target.value })}
              />
            </label>
            <label className="sop-span-2">
              Description
              <textarea
                rows={2}
                value={draft.description}
                disabled={disabled || saving}
                onChange={(event) => updateDraft({ description: event.target.value })}
              />
            </label>
          </div>

          <div className="sop-steps">
            <div className="sop-steps-header">
              <h4>Steps</h4>
              <button type="button" className="ghost-button" disabled={disabled || saving} onClick={addStep}>
                Add step
              </button>
            </div>
            {draft.steps.map((step, index) => (
              <div key={`step-${index}`} className="sop-step-card">
                <div className="sop-step-header">
                  <strong>Step {index + 1}</strong>
                  {draft.steps.length > 1 ? (
                    <button type="button" className="ghost-button" disabled={disabled || saving} onClick={() => removeStep(index)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="sop-form-grid">
                  <label>
                    Title
                    <input
                      value={step.title}
                      disabled={disabled || saving}
                      onChange={(event) => updateStep(index, { title: event.target.value })}
                    />
                  </label>
                  <label>
                    Owner
                    <select
                      value={step.ownerRole}
                      disabled={disabled || saving}
                      onChange={(event) => updateStep(index, { ownerRole: event.target.value })}
                    >
                      {OWNER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sop-span-2">
                    Instruction
                    <textarea
                      rows={2}
                      value={step.instruction}
                      disabled={disabled || saving}
                      onChange={(event) => updateStep(index, { instruction: event.target.value })}
                    />
                  </label>
                  <label className="sop-span-2">
                    Checklist (one item per line)
                    <textarea
                      rows={2}
                      value={step.checklist.join("\n")}
                      disabled={disabled || saving}
                      onChange={(event) =>
                        updateStep(index, {
                          checklist: event.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}

          <div className="sop-form-actions">
            <button type="submit" className="primary-button" disabled={disabled || saving}>
              {saving ? "Saving…" : "Save SOP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toDraft(sop: SopRecord): UpsertSopInput {
  return {
    id: sop.id,
    name: sop.name,
    department: sop.department,
    trigger: sop.trigger,
    description: sop.description,
    steps: sop.steps.map((step) => ({
      ...step,
      checklist: [...step.checklist],
    })),
    linkedPlaybookSkills: [...sop.linkedPlaybookSkills],
    status: sop.status,
  };
}
