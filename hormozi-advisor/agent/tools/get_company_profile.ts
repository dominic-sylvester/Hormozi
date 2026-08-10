import { defineTool } from "eve/tools";
import { z } from "zod";

import { companyProfile } from "../lib/company-state.js";

export default defineTool({
  description: "Read the shared company profile used across all departments.",
  inputSchema: z.object({}),
  async execute() {
    return companyProfile.get();
  },
});
