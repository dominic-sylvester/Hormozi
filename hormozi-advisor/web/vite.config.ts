import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
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

export default defineConfig({
  plugins: [react(), companyCatalogApiPlugin()],
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
