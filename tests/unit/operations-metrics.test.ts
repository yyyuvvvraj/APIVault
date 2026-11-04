import { describe, expect, it } from "vitest";
import { formatQueueAge, getImportProgress } from "@/lib/admin/operations-metrics";

describe("operations metrics", () => {
  it("formats queue age without negative values", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");
    expect(formatQueueAge(new Date("2026-11-02T11:00:00.000Z"), now)).toBe("2d 1h");
    expect(formatQueueAge(new Date("2026-11-04T13:00:00.000Z"), now)).toBe("0h");
  });

  it("clamps import progress and handles empty runs", () => {
    expect(getImportProgress(1, 4)).toBe(25);
    expect(getImportProgress(5, 4)).toBe(100);
    expect(getImportProgress(-1, 4)).toBe(0);
    expect(getImportProgress(0, 0)).toBe(0);
  });
});
