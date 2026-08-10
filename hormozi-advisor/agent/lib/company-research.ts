import type { CompanyProfile } from "./company-state.js";

export type ResearchSource = {
  url: string;
  title: string;
};

export type CompanyResearchDraft = {
  websiteUrl: string;
  draftProfile: Partial<
    Pick<
      CompanyProfile,
      | "companyName"
      | "offer"
      | "avatar"
      | "promise"
      | "pricePoint"
      | "channel"
      | "websiteUrl"
    >
  >;
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

function findPricePoint(text: string): string | null {
  const match = text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/i);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? null;
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

function guessAvatar(text: string, offer: string | null): string | null {
  const patterns = [
    /(?:for|helping|built for|designed for)\s+([^.!?]{8,120})/i,
    /(?:ideal for|perfect for)\s+([^.!?]{8,120})/i,
    /(?:who we serve|our clients are)\s+([^.!?]{8,120})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }
  if (offer && /coaching|transformation|fitness|weight loss/i.test(offer)) {
    return "People seeking measurable transformation with guided accountability";
  }
  return null;
}

function guessOffer(title: string | null, description: string | null, text: string): string | null {
  if (description && description.length >= 20) {
    return description;
  }
  const headingMatch = text.match(
    /(?:^|\s)((?:we help|we offer|our program|our service|get)[^.!?]{10,160}[.!?])/i,
  );
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }
  if (title) {
    return title.replace(/\s*[|\-–].*$/, "").trim();
  }
  return firstMeaningfulSentence(text);
}

function buildResearchNotes(sources: ResearchSource[]): string {
  if (sources.length === 0) {
    return "No public pages could be fetched. Ask the user to confirm details manually.";
  }
  const lines = sources.map((source) => `- ${source.title}: ${source.url}`);
  return [
    "Draft profile inferred from public website pages:",
    ...lines,
    "",
    "Treat all fields as unverified until the user confirms them.",
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

  const offer = guessOffer(title, description, combinedText);
  const companyName = siteName ?? title?.split(/[|\-–]/)[0]?.trim() ?? domainLabel(parsed);
  const promise =
    description ??
    firstMeaningfulSentence(combinedText) ??
    (offer ? `Help customers achieve results through ${offer.toLowerCase()}` : null);
  const pricePoint = findPricePoint(combinedText);
  const avatar = guessAvatar(combinedText, offer);
  const channel = guessChannel(combinedText);

  const draftProfile = {
    websiteUrl,
    companyName: companyName || domainLabel(parsed),
    offer: offer ?? "",
    avatar: avatar ?? "",
    promise: promise ?? "",
    pricePoint: pricePoint ?? "",
    channel: channel ?? "",
  };

  const researchSources = pages.map((page) => ({
    url: page.url,
    title: page.title,
  }));

  return {
    websiteUrl,
    draftProfile,
    researchNotes: buildResearchNotes(researchSources),
    researchSources,
    pagesFetched: pages.length,
  };
}

export function evalFixtureCompanyResearch(url: string): CompanyResearchDraft {
  const websiteUrl = normalizeWebsiteUrl(url);
  return {
    websiteUrl,
    draftProfile: {
      websiteUrl,
      companyName: "Eval Fitness Co",
      offer: "12-week body transformation coaching program",
      avatar: "Busy professionals who want to lose 20+ lbs without crash diets",
      promise: "Lose 20+ lbs in 12 weeks with a proven nutrition and accountability system",
      pricePoint: "$3,000",
      channel: "Paid social",
    },
    researchNotes: [
      "Eval fixture research for deterministic tests.",
      `- Homepage: ${websiteUrl}`,
      "",
      "Treat all fields as unverified until the user confirms them.",
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
      draftProfile: {
        websiteUrl,
        companyName: domainLabel(parsed),
      },
      researchNotes:
        "Could not fetch readable HTML from the website. Ask the user to describe their offer, ICP, and pricing manually.",
      researchSources: [],
      pagesFetched: 0,
    };
  }

  return extractDraftFromPages(websiteUrl, pages);
}
