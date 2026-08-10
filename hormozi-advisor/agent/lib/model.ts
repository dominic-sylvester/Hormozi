import { defineDynamic } from "eve";
import { mockModel } from "eve/evals";

import { createEvalModel } from "./eval-model.js";

export type ModelRole = "ceo" | "department" | "specialist";

const gatewayFallback =
  process.env.HORMOZI_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6";

function evalFixtureModel(role: ModelRole) {
  return role === "ceo"
    ? createEvalModel()
    : mockModel(`${role} eval response.`);
}

function productionModel(role: ModelRole) {
  if (role === "department") {
    return (
      process.env.HORMOZI_DEPARTMENT_MODEL ??
      process.env.HORMOZI_SUBAGENT_MODEL ??
      gatewayFallback
    );
  }

  if (role === "specialist") {
    return (
      process.env.HORMOZI_SPECIALIST_MODEL ??
      process.env.HORMOZI_SUBAGENT_MODEL ??
      gatewayFallback
    );
  }

  return gatewayFallback;
}

export function resolveModel(role: ModelRole = "ceo") {
  return defineDynamic({
    fallback: gatewayFallback,
    events: {
      "session.started": () => productionModel(role),
      "step.started": () => {
        if (process.env.EVE_EVAL !== "1") return null;
        return evalFixtureModel(role);
      },
    },
  });
}
