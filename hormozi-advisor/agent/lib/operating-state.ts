import { slugifyId, nowIso, type CatalogStatus } from "./company-state.js";

export type ActionItemStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";

export type ActionItemOwner =
  | "user"
  | "ceo"
  | "growth"
  | "monetization"
  | "sales"
  | "success"
  | "brand";

export type ActionItemPriority = "low" | "medium" | "high";

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  owner: ActionItemOwner;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  dueAt: string | null;
  offerId: string | null;
  avatarId: string | null;
  department: string | null;
  source: string;
  sopId: string | null;
  sopStepOrder: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ActionItemStore = {
  items: ActionItem[];
  updatedAt: string | null;
};

export type SopStep = {
  order: number;
  title: string;
  instruction: string;
  ownerRole: ActionItemOwner;
  estimatedMinutes: number | null;
  checklist: string[];
};

export type Sop = {
  id: string;
  name: string;
  department: string;
  trigger: string;
  description: string;
  steps: SopStep[];
  linkedPlaybookSkills: string[];
  status: CatalogStatus;
  updatedAt: string;
};

export type SopStore = {
  items: Sop[];
  updatedAt: string | null;
};

export type CalendarCadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  cadence: CalendarCadence;
  cron: string | null;
  nextRunAt: string | null;
  workflowSkill: string | null;
  sopId: string | null;
  department: string | null;
  enabled: boolean;
  updatedAt: string;
};

export type CalendarStore = {
  events: CalendarEvent[];
  updatedAt: string | null;
};

export const emptyActionItemStore = (): ActionItemStore => ({
  items: [],
  updatedAt: null,
});

export const emptySopStore = (): SopStore => ({
  items: [],
  updatedAt: null,
});

export const emptyCalendarStore = (): CalendarStore => ({
  events: [],
  updatedAt: null,
});

export function newActionItemId(title: string): string {
  return `${slugifyId(title)}-${Date.now().toString(36)}`;
}

export function normalizeActionItemStore(store: Partial<ActionItemStore> | null | undefined): ActionItemStore {
  const base = emptyActionItemStore();
  if (!store) return base;
  return {
    items: Array.isArray(store.items) ? store.items : base.items,
    updatedAt: store.updatedAt ?? base.updatedAt,
  };
}

export function normalizeSopStore(store: Partial<SopStore> | null | undefined): SopStore {
  const base = emptySopStore();
  if (!store) return base;
  return {
    items: Array.isArray(store.items) ? store.items : base.items,
    updatedAt: store.updatedAt ?? base.updatedAt,
  };
}

export function normalizeCalendarStore(store: Partial<CalendarStore> | null | undefined): CalendarStore {
  const base = emptyCalendarStore();
  if (!store) return base;
  return {
    events: Array.isArray(store.events) ? store.events : base.events,
    updatedAt: store.updatedAt ?? base.updatedAt,
  };
}

export function sortActionItems(items: ActionItem[]): ActionItem[] {
  const rank = (item: ActionItem) => {
    if (item.status === "done" || item.status === "cancelled") return 3;
    if (item.dueAt) return 1;
    return 2;
  };
  return [...items].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export { nowIso, slugifyId };
