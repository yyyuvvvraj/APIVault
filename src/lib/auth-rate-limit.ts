export function isAuthRateLimitEnabled(
  env: { CI?: string; E2E_TEST_MODE?: string } = process.env,
): boolean {
  // Only GitHub Actions' isolated E2E job may disable auth throttling.
  // An accidentally copied E2E_TEST_MODE value must never disable production limits.
  return !(env.CI === "true" && env.E2E_TEST_MODE === "true");
}
