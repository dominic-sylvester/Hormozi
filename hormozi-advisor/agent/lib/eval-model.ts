import { mockModel } from "eve/evals";

function extractEvalDirective(message: string | null): string {
  const text = message ?? "";
  const match = text.match(/EVE_EVAL:\s*(.+)/i);
  return (match?.[1] ?? text).trim().toLowerCase();
}

const EVAL_COMPANY = {
  companyName: "Eval Fitness Co",
  websiteUrl: "https://eval-fitness.com",
  brandPromise: "Lose 20+ lbs in 12 weeks with a proven nutrition and accountability system",
  researchNotes: "Eval fixture research for deterministic tests.",
  researchSources: [{ url: "https://eval-fitness.com", title: "Eval Fitness Co" }],
};

const EVAL_OFFER = {
  id: "coaching-12-week",
  name: "12-Week Transformation Program",
  description: "12-week transformation program",
  promise: "Lose 20+ lbs in 12 weeks",
  pricePoint: "$3,000",
  channel: "Paid social",
  status: "active" as const,
  targetAvatarIds: ["busy-professionals"],
};

const EVAL_AVATAR = {
  id: "busy-professionals",
  name: "Busy professionals",
  description: "Busy professionals who want to lose 20+ lbs",
  status: "active" as const,
};

export function createEvalModel() {
  return mockModel(({ lastUserMessage, toolResults, messages }) => {
    const respondingToToolResults =
      toolResults.length > 0 && messages.at(-1)?.role === "tool";

    if (respondingToToolResults) {
      const toolNames = toolResults.map((result) =>
        String((result as { toolName?: string }).toolName ?? result.name ?? ""),
      );
      if (toolNames.includes("get_company_profile") || toolNames.includes("get_company_catalog")) {
        return { text: "Here is the current shared company profile catalog." };
      }
      if (
        toolNames.some((name) =>
          [
            "update_company_profile",
            "upsert_offer",
            "upsert_avatar",
            "set_active_context",
            "create_company",
            "select_company",
          ].includes(name),
        )
      ) {
        return { text: "Shared company profile updated." };
      }
      if (toolNames.includes("research_company_from_url")) {
        return {
          text: "Here is the draft offers and avatars catalog from website research. Please confirm before I persist anything.",
        };
      }
      if (toolNames.includes("load_skill")) {
        return { text: "Applied the loaded playbook skill." };
      }
      if (toolNames.includes("growth")) {
        return { text: "Growth department completed the brief." };
      }
      return { text: "Eval fixture step complete." };
    }

    const message = extractEvalDirective(lastUserMessage);

    if (message.includes("get company catalog") || message.includes("get_company_catalog")) {
      return { toolCalls: [{ name: "get_company_catalog", input: {} }] };
    }

    if (message.includes("read the shared company profile") || message.includes("get_company_profile")) {
      return { toolCalls: [{ name: "get_company_profile", input: {} }] };
    }

    if (message.includes("set active context to company")) {
      return {
        toolCalls: [
          {
            name: "set_active_context",
            input: { offerId: EVAL_OFFER.id, avatarId: EVAL_AVATAR.id },
          },
        ],
      };
    }

    if (message.includes("switch to company")) {
      const companyMatch = message.match(/company "([^"]+)"/i);
      return {
        toolCalls: [
          {
            name: "select_company",
            input: { companyId: companyMatch?.[1] ?? "default" },
          },
        ],
      };
    }

    if (message.includes("set active context")) {
      return {
        toolCalls: [
          {
            name: "set_active_context",
            input: { offerId: EVAL_OFFER.id, avatarId: EVAL_AVATAR.id },
          },
        ],
      };
    }

    if (message.includes("upsert eval offer") || message.includes("multi-turn persist offer")) {
      return { toolCalls: [{ name: "upsert_offer", input: EVAL_OFFER }] };
    }

    if (message.includes("upsert eval avatar") || message.includes("multi-turn persist avatar")) {
      return { toolCalls: [{ name: "upsert_avatar", input: EVAL_AVATAR }] };
    }

    if (message.includes("update the shared company profile") || message.includes("update_company_profile")) {
      return {
        toolCalls: [{ name: "update_company_profile", input: { companyName: EVAL_COMPANY.companyName } }],
      };
    }

    if (message.includes("multi-turn persist profile")) {
      return { toolCalls: [{ name: "upsert_offer", input: EVAL_OFFER }] };
    }

    if (message.includes("multi-turn confirm researched profile")) {
      return {
        toolCalls: [
          { name: "update_company_profile", input: EVAL_COMPANY },
          { name: "upsert_offer", input: EVAL_OFFER },
          { name: "upsert_avatar", input: EVAL_AVATAR },
          {
            name: "set_active_context",
            input: { offerId: EVAL_OFFER.id, avatarId: EVAL_AVATAR.id },
          },
        ],
      };
    }

    if (message.includes("load hooks skill") || message.includes("load_skill hooks")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "hooks" } }] };
    }

    if (message.includes("delegate to growth") || message.includes("call growth")) {
      return {
        toolCalls: [{ name: "growth", input: { message: lastUserMessage } }],
      };
    }

    if (message.includes("launch offer workflow") || message.includes("workflow-launch-offer")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-launch-offer" } }] };
    }

    if (message.includes("company setup") || message.includes("workflow-company-setup")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-company-setup" } }] };
    }

    if (message.includes("multi-turn launch workflow")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-launch-offer" } }] };
    }

    if (message.includes("multi-turn research company from")) {
      const urlMatch = message.match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}/i);
      return {
        toolCalls: [
          {
            name: "research_company_from_url",
            input: { url: urlMatch?.[0] ?? "https://eval-fitness.com" },
          },
        ],
      };
    }

    if (message.includes("research company from") || message.includes("research my company from")) {
      const urlMatch = message.match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}/i);
      return {
        toolCalls: [
          {
            name: "research_company_from_url",
            input: { url: urlMatch?.[0] ?? "https://eval-fitness.com" },
          },
        ],
      };
    }

    if (message.includes("multi-turn growth brief")) {
      return {
        toolCalls: [{ name: "growth", input: { message: lastUserMessage } }],
      };
    }

    if (message.includes("multi-turn verify profile")) {
      return { toolCalls: [{ name: "get_company_profile", input: {} }] };
    }

    if (message.includes("multi-turn company setup")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-company-setup" } }] };
    }

    if (message.includes("create eval company")) {
      return {
        toolCalls: [
          {
            name: "create_company",
            input: { companyId: "eval-agency", companyName: "Eval Agency Co" },
          },
        ],
      };
    }

    return { text: "Eval fixture acknowledgment." };
  });
}
