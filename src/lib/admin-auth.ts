import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/admin/login");
  }

  const role = "role" in session.user && typeof session.user.role === "string"
    ? session.user.role
    : "";

  if (!role.split(",").includes("admin")) {
    redirect("/admin/login?error=not-authorized");
  }

  return session;
}
