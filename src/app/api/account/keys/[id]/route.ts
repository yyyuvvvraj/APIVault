import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/security/origin";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const result = await getPrisma().apiKey.updateMany({
    where: { id, userId: session.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count !== 1) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
