export type SopStep = {
  order: number;
  title: string;
  instruction: string;
  ownerRole: string;
  estimatedMinutes: number | null;
  checklist: string[];
};

export type SopRecord = {
  id: string;
  name: string;
  department: string;
  trigger: string;
  description: string;
  steps: SopStep[];
  linkedPlaybookSkills: string[];
  status: string;
  updatedAt?: string;
};

export type SopTemplate = Pick<
  SopRecord,
  "id" | "name" | "department" | "trigger" | "description" | "steps" | "linkedPlaybookSkills" | "status"
>;

export type SopsResponse = {
  companyId: string;
  sops: SopRecord[];
  templates: SopTemplate[];
};

export type UpsertSopInput = Omit<SopRecord, "updatedAt">;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sop"
  );
}

export function newSopDraft(template?: SopTemplate): UpsertSopInput {
  if (template) {
    return {
      id: `${template.id}-custom`,
      name: `${template.name} (custom)`,
      department: template.department,
      trigger: template.trigger,
      description: template.description,
      steps: template.steps.map((step) => ({ ...step, checklist: [...step.checklist] })),
      linkedPlaybookSkills: [...template.linkedPlaybookSkills],
      status: "draft",
    };
  }

  return {
    id: "",
    name: "",
    department: "ceo",
    trigger: "",
    description: "",
    steps: [
      {
        order: 1,
        title: "",
        instruction: "",
        ownerRole: "user",
        estimatedMinutes: null,
        checklist: [],
      },
    ],
    linkedPlaybookSkills: [],
    status: "draft",
  };
}

export function normalizeSopInput(input: UpsertSopInput): UpsertSopInput {
  const name = input.name.trim();
  return {
    ...input,
    id: input.id.trim() || slugify(name || "sop"),
    name,
    department: input.department.trim() || "ceo",
    trigger: input.trigger.trim(),
    description: input.description.trim(),
    steps: input.steps
      .filter((step) => step.title.trim() || step.instruction.trim())
      .map((step, index) => ({
        ...step,
        order: index + 1,
        title: step.title.trim(),
        instruction: step.instruction.trim(),
        checklist: step.checklist.filter(Boolean),
      })),
    linkedPlaybookSkills: input.linkedPlaybookSkills.filter(Boolean),
  };
}

export async function fetchSops(companyId = "default"): Promise<SopsResponse | null> {
  try {
    const response = await fetch(`/api/sops?companyId=${encodeURIComponent(companyId)}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SopsResponse;
  } catch {
    return null;
  }
}

export async function saveSop(companyId: string, sop: UpsertSopInput): Promise<SopRecord | null> {
  try {
    const response = await fetch(`/api/sops?companyId=${encodeURIComponent(companyId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeSopInput(sop)),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SopRecord;
  } catch {
    return null;
  }
}

export function buildSpawnSopMessage(sopId: string, sopName: string): string {
  return `Spawn action items from SOP "${sopName}" (${sopId}) using spawn_action_items_from_sop.`;
}

export function buildAuthorSopMessage(input?: { sopId?: string; topic?: string }): string {
  if (input?.sopId) {
    return `Load workflow-sop-authoring and help me edit SOP "${input.sopId}". Interview me on changes, then persist with upsert_sop after I confirm.`;
  }
  if (input?.topic) {
    return `Load workflow-sop-authoring and help me create an SOP for: ${input.topic}. Interview me step by step, then persist with upsert_sop after I confirm.`;
  }
  return "Load workflow-sop-authoring and help me create a new SOP. Interview me step by step, then persist with upsert_sop after I confirm.";
}
