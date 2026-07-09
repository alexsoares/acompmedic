import { describe, expect, it } from "vitest";

import { UnconfiguredMedicalReportAIService } from "@/services/medical-report-ai";

describe("UnconfiguredMedicalReportAIService", () => {
  it("fails fast until an LLM adapter is configured", async () => {
    const service = new UnconfiguredMedicalReportAIService();

    await expect(service.summarizeReport({ text: "sample" })).rejects.toThrow(
      "MedicalReportAIService is not configured yet.",
    );
  });
});
