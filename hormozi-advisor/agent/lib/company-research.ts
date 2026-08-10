import {
  emptyMetrics,
  nowIso,
  slugifyId,
  type Avatar,
  type Offer,
} from "./company-state.js";

export type ResearchSource = {
  url: string;
  title: string;
};

export type SuggestedContextLink = {
  offerId: string;
  avatarId: string;
};

export type CompanyResearchDraft = {
  websiteUrl: string;
  draftCompany: {
    companyName: string;
    websiteUrl: string;
    brandPromise: string;
  };
  inferredOffers: Array<
    Pick<
      Offer,
      "id" | "name" | "description" | "promise" | "pricePoint" | "channel" | "targetAvatarIds"
    >
  >;
  inferredAvatars: Array<Pick<Avatar, "id" | "name" | "description">>;
  suggestedLinks: SuggestedContextLink[];
  researchNotes: string;
  researchSources: ResearchSource[];
  pagesFetched: number;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_TEXT_CHARS = 12_000;
const USER_AGENT =
  "HormoziCompanyResearch/1.0 (+https://github.com/dominic-sylvester/Hormozi)";

const COMMON_PATHS = ["/", "/about", "/about-us", "/services", "/pricing", "/programs"];

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  url.hash = "";
  return url.toString().replace(/\/$/, "") || url.origin;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readMetaContent(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function readTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim().replace(/\s+/g, " ") ?? null;
}

function domainLabel(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "");
  const base = host.split(".")[0] ?? host;
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function firstMeaningfulSentence(text: string): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24 && sentence.length <= 220);
  return sentences[0] ?? null;
}

function findPricePoints(text: string): string[] {
  const matches = text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/gi) ?? [];
  return [...new Set(matches.map((value) => value.replace(/\s+/g, " ").trim()))].slice(0, 4);
}

function guessChannel(text: string): string | null {
  const lower = text.toLowerCase();
  if (/facebook|instagram|meta ads|paid social/.test(lower)) return "Paid social";
  if (/google ads|search ads|ppc|sem/.test(lower)) return "Paid search";
  if (/youtube|tiktok|linkedin|twitter|x\.com/.test(lower)) return "Content / social organic";
  if (/referral|word of mouth|affiliate|partner/.test(lower)) return "Referrals / partners";
  if (/webinar|workshop|event|speaking/.test(lower)) return "Events / webinars";
  if (/email|newsletter|sms|text message/.test(lower)) return "Email / SMS";
  if (/cold call|outbound|cold email|prospecting/.test(lower)) return "Outbound sales";
  return null;
}

function guessAvatars(text: string): Array<Pick<Avatar, "id" | "name" | "description">> {
  const patterns = [
    /(?:for|helping|built for|designed for|ideal for|perfect for|who we serve|our clients are)\s+([^.!?]{8,120})/gi,
  ];
  const avatars: Array<Pick<Avatar, "id" | "name" | "description">> = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const description = match[1]?.trim().replace(/\s+/g, " ");
      if (!description) continue;
      const id = slugifyId(description.slice(0, 48));
      if (avatars.some((avatar) => avatar.id === id)) continue;
      avatars.push({
        id,
        name: description.slice(0, 60),
        description,
      });
      if (avatars.length >= 3) return avatars;
    }
  }
  return avatars;
}

function inferOffersFromText(
  combinedText: string,
  prices: string[],
  channel: string | null,
  primaryName: string,
  primaryDescription: string,
): CompanyResearchDraft["inferredOffers"] {
  const offers: CompanyResearchDraft["inferredOffers"] = [];
  const programMatches = [
    ...combinedText.matchAll(
      /((?:\d+\s*[- ]?(?:week|day|month)[\s\w-]{0,40})|(?:coaching|program|challenge|membership|retainer|consulting)[^.!?]{0,100})/gi,
    ),
  ];

  for (const match of programMatches) {
    const fragment = match[1]?.trim();
    if (!fragment || fragment.length < 12) continue;
    const id = slugifyId(fragment.slice(0, 48));
    if (offers.some((offer) => offer.id === id)) continue;
    offers.push({
      id,
      name: fragment.slice(0, 80),
      description: fragment,
      promise: primaryDescription,
      pricePoint: prices[offers.length] ?? prices[0] ?? "",
      channel: channel ?? "",
      targetAvatarIds: [],
    });
    if (offers.length >= 3) break;
  }

  if (offers.length === 0) {
    offers.push({
      id: slugifyId(primaryName),
      name: primaryName,
      description: primaryDescription,
      promise: primaryDescription,
      pricePoint: prices[0] ?? "",
      channel: channel ?? "",
      targetAvatarIds: [],
    });
  }

  if (offers.length === 1 && prices.length > 1) {
    offers.push({
      id: `${offers[0].id}-premium`,
      name: `${offers[0].name} (premium tier)`,
      description: `Premium tier inferred from additional pricing signal ${prices[1]}`,
      promise: offers[0].promise,
      pricePoint: prices[1] ?? "",
      channel: channel ?? "",
      targetAvatarIds: [],
    });
  }

  return offers;
}

function buildResearchNotes(sources: ResearchSource[], offerCount: number, avatarCount: number): string {
  if (sources.length === 0) {
    return "No public pages could be fetched. Ask the user to confirm details manually.";
  }
  const lines = sources.map((source) => `- ${source.title}: ${source.url}`);
  return [
    "Draft catalogs inferred from public website pages:",
    ...lines,
    "",
    `Inferred ${offerCount} offer(s) and ${avatarCount} avatar(s).`,
    "Treat all entries as unverified until the user confirms them.",
  ].join("\n");
}

async function fetchPage(
  url: string,
): Promise<{ url: string; title: string; text: string; description: string | null; siteName: string | null } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = (await response.text()).slice(0, 500_000);
    const title = readTitle(html) ?? url;
    const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
    if (text.length < 40) {
      return null;
    }

    return {
      url,
      title,
      text,
      description:
        readMetaContent(html, "description") ?? readMetaContent(html, "og:description"),
      siteName:
        readMetaContent(html, "og:site_name") ??
        readMetaContent(html, "application-name"),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateUrls(baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const urls = new Set<string>([origin, baseUrl]);
  for (const path of COMMON_PATHS) {
    try {
      urls.add(new URL(path, origin).toString().replace(/\/$/, "") || origin);
    } catch {
      // ignore invalid combinations
    }
  }
  return [...urls];
}

function extractDraftFromPages(
  websiteUrl: string,
  pages: Array<{
    url: string;
    title: string;
    text: string;
    description: string | null;
    siteName: string | null;
  }>,
): CompanyResearchDraft {
  const combinedText = pages.map((page) => page.text).join("\n\n");
  const homepage =
    pages.find((page) => {
      try {
        return new URL(page.url).pathname === "/" || page.url === websiteUrl;
      } catch {
        return false;
      }
    }) ?? pages[0];

  const description = homepage?.description ?? pages.find((page) => page.description)?.description ?? null;
  const siteName = homepage?.siteName ?? pages.find((page) => page.siteName)?.siteName ?? null;
  const title = homepage?.title ?? null;
  const parsed = new URL(websiteUrl);
  const companyName = siteName ?? title?.split(/[|\-–]/)[0]?.trim() ?? domainLabel(parsed);
  const brandPromise =
    description ??
    firstMeaningfulSentence(combinedText) ??
    `Help customers achieve measurable results with ${companyName}`;
  const prices = findPricePoints(combinedText);
  const channel = guessChannel(combinedText);
  const inferredAvatars = guessAvatars(combinedText);
  const inferredOffers = inferOffersFromText(
    combinedText,
    prices,
    channel,
    companyName,
    brandPromise,
  );

  if (inferredAvatars.length === 0) {
    inferredAvatars.push({
      id: "primary-avatar",
      name: "Primary ICP",
      description: "Primary ideal client inferred from homepage messaging",
    });
  }

  for (const offer of inferredOffers) {
    offer.targetAvatarIds = [inferredAvatars[0]?.id ?? "primary-avatar"];
  }

  const suggestedLinks = inferredOffers.slice(0, 2).map((offer) => ({
    offerId: offer.id,
    avatarId: offer.targetAvatarIds[0] ?? inferredAvatars[0]?.id ?? "primary-avatar",
  }));

  const researchSources = pages.map((page) => ({
    url: page.url,
    title: page.title,
  }));

  return {
    websiteUrl,
    draftCompany: {
      companyName: companyName || domainLabel(parsed),
      websiteUrl,
      brandPromise,
    },
    inferredOffers,
    inferredAvatars,
    suggestedLinks,
    researchNotes: buildResearchNotes(researchSources, inferredOffers.length, inferredAvatars.length),
    researchSources,
    pagesFetched: pages.length,
  };
}

export function evalFixtureCompanyResearch(url: string): CompanyResearchDraft {
  const websiteUrl = normalizeWebsiteUrl(url);
  return {
    websiteUrl,
    draftCompany: {
      companyName: "Eval Fitness Co",
      websiteUrl,
      brandPromise: "Lose 20+ lbs in 12 weeks with a proven nutrition and accountability system",
    },
    inferredOffers: [
      {
        id: "coaching-12-week",
        name: "12-Week Body Transformation Coaching",
        description: "12-week body transformation coaching program",
        promise: "Lose 20+ lbs in 12 weeks with accountability",
        pricePoint: "$3,000",
        channel: "Paid social",
        targetAvatarIds: ["busy-professionals"],
      },
      {
        id: "challenge-21-day",
        name: "21-Day Kickstart Challenge",
        description: "Low-ticket challenge offer inferred from pricing page",
        promise: "Build momentum with a short challenge before coaching",
        pricePoint: "$47",
        channel: "Paid social",
        targetAvatarIds: ["busy-professionals"],
      },
    ],
    inferredAvatars: [
      {
        id: "busy-professionals",
        name: "Busy professionals",
        description: "Busy professionals who want to lose 20+ lbs without crash diets",
      },
      {
        id: "new-moms",
        name: "New moms",
        description: "New moms rebuilding fitness routines with limited time",
      },
    ],
    suggestedLinks: [
      { offerId: "coaching-12-week", avatarId: "busy-professionals" },
      { offerId: "challenge-21-day", avatarId: "busy-professionals" },
    ],
    researchNotes: [
      "Eval fixture research for deterministic tests.",
      `- Homepage: ${websiteUrl}`,
      "",
      "Treat all entries as unverified until the user confirms them.",
    ].join("\n"),
    researchSources: [{ url: websiteUrl, title: "Eval Fitness Co" }],
    pagesFetched: 1,
  };
}

export async function researchCompanyFromUrl(rawUrl: string): Promise<CompanyResearchDraft> {
  if (process.env.EVE_EVAL === "1") {
    return evalFixtureCompanyResearch(rawUrl);
  }

  const websiteUrl = normalizeWebsiteUrl(rawUrl);
  const urls = candidateUrls(websiteUrl);
  const pages: Array<{
    url: string;
    title: string;
    text: string;
    description: string | null;
    siteName: string | null;
  }> = [];

  for (const url of urls) {
    const page = await fetchPage(url);
    if (page) {
      pages.push(page);
    }
    if (pages.length >= 4) {
      break;
    }
  }

  if (pages.length === 0) {
    const parsed = new URL(websiteUrl);
    return {
      websiteUrl,
      draftCompany: {
        companyName: domainLabel(parsed),
        websiteUrl,
        brandPromise: "",
      },
      inferredOffers: [],
      inferredAvatars: [],
      suggestedLinks: [],
      researchNotes:
        "Could not fetch readable HTML from the website. Ask the user to describe offers and ICPs manually.",
      researchSources: [],
      pagesFetched: 0,
    };
  }

  return extractDraftFromPages(websiteUrl, pages);
}
