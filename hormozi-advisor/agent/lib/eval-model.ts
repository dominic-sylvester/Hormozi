import { mockModel } from "eve/evals";

function extractEvalDirective(message: string | null): string {
  const text = message ?? "";
  const match = text.match(/EVE_EVAL:\s*(.+)/i);
  return (match?.[1] ?? text).trim().toLowerCase();
}

export function createEvalModel() {
  return mockModel(({ lastUserMessage, toolResults, messages }) => {
    const respondingToToolResults =
      toolResults.length > 0 && messages.at(-1)?.role === "tool";

    if (respondingToToolResults) {
      const toolNames = toolResults.map((result) =>
        String((result as { toolName?: string }).toolName ?? result.name ?? ""),
      );
      if (toolNames.includes("get_company_profile")) {
        return { text: "Here is the current shared company profile." };
      }
      if (toolNames.includes("update_company_profile")) {
        return { text: "Shared company profile updated." };
      }
      if (toolNames.includes("research_company_from_url")) {
        return {
          text: "Here is the draft profile from website research. Please confirm or correct each field before I persist it.",
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

    if (message.includes("read the shared company profile") || message.includes("get_company_profile")) {
      return { toolCalls: [{ name: "get_company_profile", input: {} }] };
    }

    if (message.includes("update the shared company profile") || message.includes("update_company_profile")) {
      return {
        toolCalls: [
          {
            name: "update_company_profile",
            input: {
              companyName: "Eval Fitness Co",
              offer: "12-week transformation program",
              avatar: "Busy professionals who want to lose 20+ lbs",
            },
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

    if (message.includes("multi-turn confirm researched profile")) {
      return {
        toolCalls: [
          {
            name: "update_company_profile",
            input: {
              companyName: "Eval Fitness Co",
              websiteUrl: "https://eval-fitness.com",
              offer: "12-week body transformation coaching program",
              avatar: "Busy professionals who want to lose 20+ lbs without crash diets",
              promise: "Lose 20+ lbs in 12 weeks with a proven nutrition and accountability system",
              pricePoint: "$3,000",
              channel: "Paid social",
              researchNotes: "Eval fixture research for deterministic tests.",
              researchSources: [{ url: "https://eval-fitness.com", title: "Eval Fitness Co" }],
            },
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

    if (message.includes("multi-turn persist profile")) {
      return {
        toolCalls: [
          {
            name: "update_company_profile",
            input: {
              companyName: "Eval Fitness Co",
              offer: "12-week transformation program",
              avatar: "Busy professionals who want to lose 20+ lbs",
            },
          },
        ],
      };
    }

    return { text: "Eval fixture acknowledgment." };
  });
}
