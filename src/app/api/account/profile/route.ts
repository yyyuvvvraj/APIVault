import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/security/origin";

const profileSchema = z.object({
  handle: z.string().trim().min(3).max(39).regex(/^[a-zA-Z0-9-]+$/),
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(280).optional(),
  websiteUrl: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://"), "Use an HTTPS URL.")]).optional(),
  githubUrl: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://github.com/"), "Use a GitHub profile URL.")]).optional(),
  isPublic: z.boolean(),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getPrisma().contributorProfile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ data: profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  const input = parsed.data;
  try {
    const profile = await getPrisma().contributorProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, handle: input.handle.toLowerCase(), displayName: input.displayName, bio: input.bio || null, websiteUrl: input.websiteUrl || null, githubUrl: input.githubUrl || null, isPublic: input.isPublic },
      update: { handle: input.handle.toLowerCase(), displayName: input.displayName, bio: input.bio || null, websiteUrl: input.websiteUrl || null, githubUrl: input.githubUrl || null, isPublic: input.isPublic },
    });
    return NextResponse.json({ data: profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "handle_taken", message: "That contributor handle is already in use." }, { status: 409 });
    }
    throw error;
  }
}
