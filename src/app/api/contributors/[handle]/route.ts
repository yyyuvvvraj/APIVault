import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

type Context = { params: Promise<{ handle: string }> };

export async function GET(_request: Request, context: Context) {
  const { handle } = await context.params;
  const profile = await getPrisma().contributorProfile.findFirst({
    where: { handle: handle.toLowerCase(), isPublic: true },
    select: {
      handle: true, displayName: true, bio: true, websiteUrl: true, githubUrl: true, createdAt: true,
      user: { select: { submissions: { where: { status: "APPROVED" }, select: { id: true } } } },
    },
  });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    data: {
      handle: profile.handle, displayName: profile.displayName, bio: profile.bio,
      websiteUrl: profile.websiteUrl, githubUrl: profile.githubUrl,
      joinedAt: profile.createdAt, approvedContributions: profile.user.submissions.length,
    },
  }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
