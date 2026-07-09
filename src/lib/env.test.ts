import { describe, expect, it } from "vitest";

import { MEDICAL_REPORT_ALLOWED_EXTENSIONS, MEDICAL_REPORT_ALLOWED_MIME_TYPES } from "@/lib/constants";

describe("medical report upload constraints", () => {
  it("supports only pdf and txt extensions", () => {
    expect(MEDICAL_REPORT_ALLOWED_EXTENSIONS).toEqual(["pdf", "txt"]);
  });

  it("supports only pdf and plain text mime types", () => {
    expect(MEDICAL_REPORT_ALLOWED_MIME_TYPES).toEqual(["application/pdf", "text/plain"]);
  });
});
