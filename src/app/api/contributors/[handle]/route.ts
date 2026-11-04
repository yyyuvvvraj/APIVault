import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { toPublicContributorProfile } from "@/lib/contributors/public-profile";

type Context = { params: Promise<{ handle: string }> };

export async function GET(_request: Request, context: Context) {
  const { handle } = await context.params;
  const profile = await getPrisma().contributorProfile.findFirst({
    where: { handle: handle.toLowerCase() },
    select: {
      isPublic: true, handle: true, displayName: true, bio: true, websiteUrl: true, githubUrl: true, createdAt: true,
      user: { select: { submissions: { where: { status: "APPROVED" }, select: { id: true } } } },
    },
  });
  const publicProfile = profile ? toPublicContributorProfile({ ...profile, approvedContributions: profile.user.submissions.length }) : null;
  if (!publicProfile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: publicProfile }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
