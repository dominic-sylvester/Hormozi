export type OperatingActionItem = {
  id: string;
  title: string;
  status: string;
  owner: string;
  priority: string;
  dueAt: string | null;
  department: string | null;
};

export type OperatingCalendarEvent = {
  id: string;
  title: string;
  cadence: string;
  cron: string | null;
  department: string | null;
  workflowSkill: string | null;
};

export type OperatingDashboardResponse = {
  companyId: string;
  openActionItems: OperatingActionItem[];
  upcomingEvents: OperatingCalendarEvent[];
  counts: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
};

export async function fetchOperatingDashboard(
  companyId = "default",
): Promise<OperatingDashboardResponse | null> {
  try {
    const response = await fetch(
      `/api/operating-dashboard?companyId=${encodeURIComponent(companyId)}`,
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OperatingDashboardResponse;
  } catch {
    return null;
  }
}

export function buildCompleteActionItemMessage(id: string, title: string): string {
  return `Mark action item "${title}" (${id}) as done using complete_action_item.`;
}
