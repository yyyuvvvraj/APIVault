export type ModerationPriorityInput = {
  status: string;
  kind: string;
  createdAt: Date;
  payload: unknown;
  sourceKinds: string[];
  duplicateCount: number;
  hasTargetApi: boolean;
};

export type ModerationPriority = {
  score: number;
  reasons: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function getModerationPriority(
  input: ModerationPriorityInput,
  now = new Date(),
): ModerationPriority {
  const reasons: string[] = [];
  const payload = asRecord(input.payload);
  const ageDays = Math.max(0, Math.floor((now.getTime() - input.createdAt.getTime()) / 86_400_000));
  let score = Math.min(ageDays, 30);

  if (ageDays > 0) reasons.push(`Waiting ${ageDays} day${ageDays === 1 ? "" : "s"}`);
  if (input.status === "PENDING") {
    score += 10;
    reasons.push("Awaiting first review");
  } else if (input.status === "IN_REVIEW") {
    score += 5;
    reasons.push("Review in progress");
  }

  if (input.duplicateCount > 0) {
    score += Math.min(input.duplicateCount * 20, 40);
    reasons.push(`${input.duplicateCount} possible duplicate match${input.duplicateCount === 1 ? "" : "es"}`);
  }

  if (input.sourceKinds.length === 0) {
    score += 20;
    reasons.push("No source evidence attached");
  } else if (!input.sourceKinds.some((kind) => kind === "OFFICIAL_HOMEPAGE" || kind === "DOCUMENTATION")) {
    score += 15;
    reasons.push("No official homepage or documentation source");
  }

  const requiredFields = ["name", "providerName", "homepageUrl", "summary"];
  const missing = requiredFields.filter((field) => typeof payload[field] !== "string" || !(payload[field] as string).trim());
  if (missing.length > 0) {
    score += Math.min(missing.length * 5, 20);
    reasons.push(`Missing metadata: ${missing.join(", ")}`);
  }

  if (input.kind === "UPDATE" && !input.hasTargetApi) {
    score += 10;
    reasons.push("Update target needs confirmation");
  }

  return { score, reasons };
}
