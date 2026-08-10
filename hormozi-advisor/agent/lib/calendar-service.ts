import {
  emptyCalendarStore,
  normalizeCalendarStore,
  nowIso,
  slugifyId,
  type CalendarEvent,
  type CalendarStore,
} from "./operating-state.js";
import {
  ensureCollectionIndex,
  listTemplateFiles,
  readScopedJson,
  readTemplateJson,
  writeScopedJson,
} from "./content-collection-store.js";
import type { CompanyScope } from "./tenant.js";

const COLLECTION = "calendar";

export async function listCalendarEvents(scope: CompanyScope): Promise<CalendarEvent[]> {
  await ensureCollectionIndex(COLLECTION, "Operating calendar rhythms keyed by tenant, user, and company.");
  const store = await ensureDefaultCalendar(scope);
  return store.events.filter((event) => event.enabled);
}

export async function upsertCalendarEvent(
  scope: CompanyScope,
  input: Omit<CalendarEvent, "updatedAt"> & { updatedAt?: string },
): Promise<CalendarEvent> {
  await ensureCollectionIndex(COLLECTION, "Operating calendar rhythms keyed by tenant, user, and company.");
  const store = normalizeCalendarStore(await readScopedJson(COLLECTION, scope, emptyCalendarStore()));
  const next: CalendarEvent = {
    ...input,
    id: input.id || slugifyId(input.title),
    updatedAt: nowIso(),
  };
  const index = store.events.findIndex((event) => event.id === next.id);
  if (index >= 0) {
    store.events[index] = next;
  } else {
    store.events.push(next);
  }
  await writeScopedJson(COLLECTION, scope, store);
  return next;
}

export async function ensureDefaultCalendar(scope: CompanyScope): Promise<CalendarStore> {
  const store = normalizeCalendarStore(await readScopedJson(COLLECTION, scope, emptyCalendarStore()));
  if (store.events.length > 0) {
    return store;
  }

  const templateFiles = await listTemplateFiles(COLLECTION);
  const seeded: CalendarEvent[] = [];
  for (const filename of templateFiles) {
    const template = await readTemplateJson<CalendarEvent | null>(COLLECTION, filename, null);
    if (template?.id && template.title) {
      seeded.push({ ...template, updatedAt: nowIso() });
    }
  }

  if (seeded.length === 0) {
    return store;
  }

  const nextStore: CalendarStore = { events: seeded, updatedAt: nowIso() };
  await writeScopedJson(COLLECTION, scope, nextStore);
  return nextStore;
}

export async function getCalendarStore(scope: CompanyScope): Promise<CalendarStore> {
  await ensureCollectionIndex(COLLECTION, "Operating calendar rhythms keyed by tenant, user, and company.");
  return ensureDefaultCalendar(scope);
}
