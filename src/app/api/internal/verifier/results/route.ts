import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { isVerifierAuthorized } from "@/lib/verifier-auth";

export const dynamic = "force-dynamic";

const resultSchema = z.object({
  apiId: z.string().uuid(),
  isReachable: z.boolean(),
  statusCode: z.number().int().min(100).max(599).nullable(),
  latencyMs: z.number().int().min(0).max(120_000),
  errorMessage: z.string().max(500).nullable(),
});

export async function POST(request: Request) {
  if (!isVerifierAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid health-check result.", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await getPrisma().apiHealthCheck.create({ data: parsed.data });
    return NextResponse.json({ id: result.id, checkedAt: result.checkedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Verifier result persistence failed:", error);
    return NextResponse.json({ error: "Could not persist health-check result." }, { status: 404 });
  }
}
