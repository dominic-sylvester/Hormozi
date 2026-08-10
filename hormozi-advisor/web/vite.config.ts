import react from "@vitejs/plugin-react";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";

const evePort = process.env.EVE_PORT ?? "2000";

function companyCatalogApiPlugin(): Plugin {
  const contentRoot = join(process.cwd(), "..", "..", "content", "company-profiles");

  return {
    name: "company-catalog-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/company-catalog")) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");
          const companyId = url.searchParams.get("companyId") ?? "default";
          const key = `anonymous__anonymous__${companyId}`;
          const profilePath = join(contentRoot, "items", `${key}.json`);

          let profile: Record<string, unknown> = {
            offers: [],
            avatars: [],
            active: { offerId: null, avatarId: null },
          };

          try {
            profile = JSON.parse(await readFile(profilePath, "utf8")) as Record<string, unknown>;
          } catch {
            // empty catalog until first onboarding write
          }

          let companies: Array<Record<string, unknown>> = [];
          try {
            const index = JSON.parse(await readFile(join(contentRoot, "collection.json"), "utf8")) as {
              items: Array<{ company_id: string; tenant_id: string; user_id: string }>;
            };
            companies = index.items
              .filter((item) => item.tenant_id === "anonymous" && item.user_id === "anonymous")
              .map((item) => ({
                companyId: item.company_id,
                companyName: item.company_id,
                websiteUrl: "",
                offerCount: 0,
                avatarCount: 0,
              }));
          } catch {
            companies = [{ companyId: "default", companyName: "Default company", websiteUrl: "", offerCount: 0, avatarCount: 0 }];
          }

          const offers = Array.isArray(profile.offers) ? profile.offers : [];
          const avatars = Array.isArray(profile.avatars) ? profile.avatars : [];
          const active =
            profile.active && typeof profile.active === "object"
              ? profile.active
              : { offerId: null, avatarId: null };

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              companyId,
              companies,
              offers: offers.map((offer) => {
                const row = offer as Record<string, unknown>;
                return {
                  id: String(row.id ?? ""),
                  name: String(row.name ?? row.id ?? ""),
                  status: String(row.status ?? "active"),
                };
              }),
              avatars: avatars.map((avatar) => {
                const row = avatar as Record<string, unknown>;
                return {
                  id: String(row.id ?? ""),
                  name: String(row.name ?? row.id ?? ""),
                  status: String(row.status ?? "active"),
                };
              }),
              active,
            }),
          );
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "catalog error" }));
        }
      });
    },
  };
}

function operatingDashboardApiPlugin(): Plugin {
  const contentRoot = join(process.cwd(), "..", "..", "content");

  function scopedPath(collection: string, companyId: string): string {
    return join(contentRoot, collection, "items", `anonymous__anonymous__${companyId}.json`);
  }

  async function readStore<T>(path: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(path, "utf8")) as T;
    } catch {
      return fallback;
    }
  }

  async function seedCalendarTemplates(): Promise<Array<Record<string, unknown>>> {
    const templatesDir = join(contentRoot, "calendar", "templates");
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(templatesDir)).filter((entry) => entry.endsWith(".json"));
      const events: Array<Record<string, unknown>> = [];
      for (const file of files) {
        events.push(JSON.parse(await readFile(join(templatesDir, file), "utf8")) as Record<string, unknown>);
      }
      return events;
    } catch {
      return [];
    }
  }

  return {
    name: "operating-dashboard-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/operating-dashboard")) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");
          const companyId = url.searchParams.get("companyId") ?? "default";

          const actionStore = await readStore<{ items?: Array<Record<string, unknown>> }>(
            scopedPath("action-items", companyId),
            { items: [] },
          );
          const calendarStore = await readStore<{ events?: Array<Record<string, unknown>> }>(
            scopedPath("calendar", companyId),
            { events: [] },
          );

          const items = Array.isArray(actionStore.items) ? actionStore.items : [];
          let events = Array.isArray(calendarStore.events) ? calendarStore.events : [];
          if (events.length === 0) {
            events = await seedCalendarTemplates();
          }

          const openActionItems = items
            .filter((item) => {
              const status = String(item.status ?? "open");
              return status === "open" || status === "in_progress" || status === "blocked";
            })
            .map((item) => ({
              id: String(item.id ?? ""),
              title: String(item.title ?? ""),
              status: String(item.status ?? "open"),
              owner: String(item.owner ?? "user"),
              priority: String(item.priority ?? "medium"),
              dueAt: item.dueAt ? String(item.dueAt) : null,
              department: item.department ? String(item.department) : null,
            }));

          const upcomingEvents = events
            .filter((event) => event.enabled !== false)
            .map((event) => ({
              id: String(event.id ?? ""),
              title: String(event.title ?? ""),
              cadence: String(event.cadence ?? "weekly"),
              cron: event.cron ? String(event.cron) : null,
              department: event.department ? String(event.department) : null,
              workflowSkill: event.workflowSkill ? String(event.workflowSkill) : null,
            }));

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              companyId,
              openActionItems,
              upcomingEvents,
              counts: {
                open: items.filter((item) => item.status === "open").length,
                inProgress: items.filter((item) => item.status === "in_progress").length,
                blocked: items.filter((item) => item.status === "blocked").length,
                done: items.filter((item) => item.status === "done").length,
              },
            }),
          );
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "dashboard error" }));
        }
      });
    },
  };
}

function sopsApiPlugin(): Plugin {
  const contentRoot = join(process.cwd(), "..", "..", "content", "sops");

  function scopedPath(companyId: string): string {
    return join(contentRoot, "items", `anonymous__anonymous__${companyId}.json`);
  }

  function slugify(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "_") || "sop";
  }

  async function readTemplates(): Promise<Array<Record<string, unknown>>> {
    try {
      const files = (await readdir(join(contentRoot, "templates"))).filter((entry) => entry.endsWith(".json"));
      const templates: Array<Record<string, unknown>> = [];
      for (const file of files) {
        templates.push(JSON.parse(await readFile(join(contentRoot, "templates", file), "utf8")) as Record<string, unknown>);
      }
      return templates;
    } catch {
      return [];
    }
  }

  async function readStore(companyId: string): Promise<{ items: Array<Record<string, unknown>>; updatedAt?: string }> {
    try {
      return JSON.parse(await readFile(scopedPath(companyId), "utf8")) as {
        items: Array<Record<string, unknown>>;
        updatedAt?: string;
      };
    } catch {
      return { items: [] };
    }
  }

  async function ensureSeededStore(companyId: string): Promise<Array<Record<string, unknown>>> {
    const store = await readStore(companyId);
    if (store.items.length > 0) {
      return store.items;
    }

    const templates = await readTemplates();
    if (templates.length === 0) {
      return [];
    }

    const seeded = templates.map((template) => ({
      ...template,
      updatedAt: new Date().toISOString(),
    }));
    await mkdir(join(contentRoot, "items"), { recursive: true });
    await writeFile(
      scopedPath(companyId),
      `${JSON.stringify({ items: seeded, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      "utf8",
    );
    return seeded;
  }

  async function upsertSop(companyId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const items = await ensureSeededStore(companyId);
    const name = String(input.name ?? "").trim();
    const id = String(input.id ?? "").trim() || slugify(name);
    const next = {
      id,
      name,
      department: String(input.department ?? "ceo"),
      trigger: String(input.trigger ?? ""),
      description: String(input.description ?? ""),
      steps: Array.isArray(input.steps) ? input.steps : [],
      linkedPlaybookSkills: Array.isArray(input.linkedPlaybookSkills) ? input.linkedPlaybookSkills : [],
      status: String(input.status ?? "draft"),
      updatedAt: new Date().toISOString(),
    };

    const index = items.findIndex((item) => String(item.id) === id);
    if (index >= 0) {
      items[index] = next;
    } else {
      items.push(next);
    }

    await mkdir(join(contentRoot, "items"), { recursive: true });
    await writeFile(
      scopedPath(companyId),
      `${JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      "utf8",
    );
    return next;
  }

  return {
    name: "sops-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/sops")) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");
          const companyId = url.searchParams.get("companyId") ?? "default";

          if (req.method === "GET") {
            const [items, templates] = await Promise.all([ensureSeededStore(companyId), readTemplates()]);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ companyId, sops: items, templates }));
            return;
          }

          if (req.method === "PUT") {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
              req.on("end", () => resolve());
              req.on("error", reject);
            });
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
            const saved = await upsertSop(companyId, body);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(saved));
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "sops error" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), companyCatalogApiPlugin(), operatingDashboardApiPlugin(), sopsApiPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/eve": {
        target: `http://127.0.0.1:${evePort}`,
        changeOrigin: true,
      },
    },
  },
});
