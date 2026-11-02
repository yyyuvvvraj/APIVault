import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAdminRole } from "@/lib/admin-role";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/admin/login");
  }

  const role = "role" in session.user ? session.user.role : undefined;
  if (!hasAdminRole(role)) {
    redirect("/admin/login?error=not-authorized");
  }

  return session;
}
