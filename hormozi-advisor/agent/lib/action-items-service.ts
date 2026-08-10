import {
  emptyActionItemStore,
  newActionItemId,
  normalizeActionItemStore,
  nowIso,
  sortActionItems,
  type ActionItem,
  type ActionItemPriority,
  type ActionItemStatus,
  type ActionItemStore,
} from "./operating-state.js";
import {
  ensureCollectionIndex,
  readScopedJson,
  scopeKey,
  writeScopedJson,
} from "./content-collection-store.js";
import type { CompanyScope } from "./tenant.js";

const COLLECTION = "action-items";

export type CreateActionItemInput = {
  title: string;
  description?: string;
  owner?: ActionItem["owner"];
  priority?: ActionItemPriority;
  dueAt?: string | null;
  offerId?: string | null;
  avatarId?: string | null;
  department?: string | null;
  source?: string;
  sopId?: string | null;
  sopStepOrder?: number | null;
};

export type ListActionItemsFilter = {
  status?: ActionItemStatus | ActionItemStatus[];
  department?: string;
  offerId?: string;
};

export async function listActionItems(
  scope: CompanyScope,
  filter: ListActionItemsFilter = {},
): Promise<ActionItem[]> {
  await ensureCollectionIndex(COLLECTION, "Company action items keyed by tenant, user, and company.");
  const store = normalizeActionItemStore(await readScopedJson(COLLECTION, scope, emptyActionItemStore()));
  let items = store.items;
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    items = items.filter((item) => statuses.includes(item.status));
  }
  if (filter.department) {
    items = items.filter((item) => item.department === filter.department);
  }
  if (filter.offerId) {
    items = items.filter((item) => item.offerId === filter.offerId);
  }
  return sortActionItems(items);
}

export async function createActionItems(
  scope: CompanyScope,
  inputs: CreateActionItemInput[],
): Promise<ActionItem[]> {
  await ensureCollectionIndex(COLLECTION, "Company action items keyed by tenant, user, and company.");
  const store = normalizeActionItemStore(await readScopedJson(COLLECTION, scope, emptyActionItemStore()));
  const created: ActionItem[] = inputs.map((input) => ({
    id: newActionItemId(input.title),
    title: input.title,
    description: input.description ?? "",
    owner: input.owner ?? "user",
    status: "open",
    priority: input.priority ?? "medium",
    dueAt: input.dueAt ?? null,
    offerId: input.offerId ?? null,
    avatarId: input.avatarId ?? null,
    department: input.department ?? null,
    source: input.source ?? "manual",
    sopId: input.sopId ?? null,
    sopStepOrder: input.sopStepOrder ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  }));
  store.items.push(...created);
  await writeScopedJson(COLLECTION, scope, store);
  return created;
}

export async function updateActionItem(
  scope: CompanyScope,
  id: string,
  patch: Partial<
    Pick<
      ActionItem,
      | "title"
      | "description"
      | "owner"
      | "status"
      | "priority"
      | "dueAt"
      | "department"
      | "offerId"
      | "avatarId"
    >
  >,
): Promise<ActionItem> {
  const store = normalizeActionItemStore(await readScopedJson(COLLECTION, scope, emptyActionItemStore()));
  const index = store.items.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error(`Unknown action item: ${id}`);
  }
  const current = store.items[index];
  let completedAt = current.completedAt;
  if (patch.status === "done") {
    completedAt = nowIso();
  } else if (patch.status !== undefined) {
    completedAt = null;
  }
  const next: ActionItem = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
    completedAt,
  };
  store.items[index] = next;
  await writeScopedJson(COLLECTION, scope, store);
  return next;
}

export async function completeActionItem(scope: CompanyScope, id: string): Promise<ActionItem> {
  return updateActionItem(scope, id, { status: "done" });
}

export async function getActionItemStore(scope: CompanyScope): Promise<ActionItemStore> {
  await ensureCollectionIndex(COLLECTION, "Company action items keyed by tenant, user, and company.");
  return normalizeActionItemStore(await readScopedJson(COLLECTION, scope, emptyActionItemStore()));
}

export function actionItemsMarkdown(scope: CompanyScope, items: ActionItem[]): string {
  const lines = items.length
    ? items.map(
        (item) =>
          `- [${item.status}] **${item.title}** (${item.owner}, ${item.priority})${item.dueAt ? ` — due ${item.dueAt}` : ""}`,
      )
    : ["- (none)"];
  return `# Action Items — ${scopeKey(scope)}

${lines.join("\n")}
`;
}
