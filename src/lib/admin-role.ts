export function hasAdminRole(role: unknown): boolean {
  return typeof role === "string" && role.split(",").some((value) => value.trim() === "admin");
}
