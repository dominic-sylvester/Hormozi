import { listActionItems } from "./action-items-service.js";
import { listCalendarEvents } from "./calendar-service.js";
import { listSops } from "./sops-service.js";
import type { ActionItem, CalendarEvent, Sop } from "./operating-state.js";
import type { CompanyScope } from "./tenant.js";

export type OperatingDashboard = {
  openActionItems: ActionItem[];
  upcomingEvents: CalendarEvent[];
  sops: Sop[];
  counts: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
};

export async function getOperatingDashboard(scope: CompanyScope): Promise<OperatingDashboard> {
  const [allItems, upcomingEvents, sops] = await Promise.all([
    listActionItems(scope),
    listCalendarEvents(scope),
    listSops(scope),
  ]);

  const openActionItems = allItems.filter(
    (item) => item.status === "open" || item.status === "in_progress" || item.status === "blocked",
  );

  return {
    openActionItems,
    upcomingEvents,
    sops,
    counts: {
      open: allItems.filter((item) => item.status === "open").length,
      inProgress: allItems.filter((item) => item.status === "in_progress").length,
      blocked: allItems.filter((item) => item.status === "blocked").length,
      done: allItems.filter((item) => item.status === "done").length,
    },
  };
}
