import { NextResponse } from "next/server";
import { ApiStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { isVerifierAuthorized } from "@/lib/verifier-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isVerifierAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedLimit = Number(url.searchParams.get("limit") ?? 100);
  const parsedOffset = Number(url.searchParams.get("offset") ?? 0);
  const take = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 500) : 100;
  const skip = Number.isFinite(parsedOffset) ? Math.min(Math.max(Math.trunc(parsedOffset), 0), 1_000_000) : 0;

  const jobs = await getPrisma().api.findMany({
    where: { status: ApiStatus.ACTIVE },
    select: { id: true, homepageUrl: true },
    orderBy: { updatedAt: "asc" },
    take,
    skip,
  });

  return NextResponse.json({ jobs });
}
