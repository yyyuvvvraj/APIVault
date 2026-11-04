import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "apivault-e2e@example.test";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "E2E-only-password-12345";

test("unauthenticated visitors cannot access the admin console", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
});

test("administrator can sign in, create and verify an API, and moderate a submission", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in to APIVault" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/admin/apis/new");
  await page.getByLabel(/API name/).fill("E2E Lifecycle API");
  await page.getByLabel(/Provider name/).fill("E2E Lifecycle Provider");
  await page.getByLabel(/Short summary/).fill("An API created by the APIVault browser test.");
  await page.getByLabel(/Official homepage/).fill("https://e2e-lifecycle.example.test");
  await page.locator('input[name="categorySlugs"]').first().check();
  await page.locator('input[name="authMethods"][value="API_KEY"]').check();
  await page.getByRole("button", { name: "Create unverified API" }).click();
  await expect(page.getByRole("status")).toContainText("API created");

  await page.goto("/admin/apis/e2e-lifecycle-api/review");
  await page.locator('select[name="status"]').selectOption("ACTIVE");
  await page.locator('select[name="verificationStatus"]').selectOption("VERIFIED");
  await page.locator('textarea[name="note"]').fill("Official homepage and metadata reviewed in E2E.");
  await page.getByRole("button", { name: "Save verification status" }).click();
  await expect(page.getByRole("status")).toContainText("verified and published");
  await page.goto("/apis/e2e-lifecycle-api");
  await expect(page.getByRole("heading", { name: "E2E Lifecycle API" })).toBeVisible();
  await expect(page.getByText("Review current", { exact: true })).toBeVisible();
  await expect(page.getByText("Next review due", { exact: true })).toBeVisible();
  await expect(page.getByText(/90-day catalogue review cadence/)).toBeVisible();

  await page.goto("/admin/submissions");
  const submission = page.locator("article").filter({ hasText: "E2E Community Member" });
  await expect(submission).toBeVisible();
  await submission.locator('select[name="nextStatus"]').selectOption("REJECTED");
  await submission.locator('textarea[name="reviewNote"]').fill("Insufficient source evidence for this proposal.");
  await submission.getByRole("button", { name: "Save review decision" }).click();
  await expect(submission).toContainText("REJECTED");
});

test("authenticated non-admin users are denied admin pages", async ({ page }) => {
  const userEmail = process.env.E2E_USER_EMAIL ?? "apivault-user-e2e@example.test";
  const userPassword = process.env.E2E_USER_PASSWORD ?? "E2E-user-only-password-12345";

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(userEmail);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Sign in to APIVault" }).click();
  // A successful sign-in must establish a session before authorization is tested.
  await expect(page).toHaveURL(/\/admin\/login\?error=not-authorized/);
  await expect(page.getByText("This account does not have administrator access.", { exact: true })).toBeVisible();

  for (const protectedPath of ["/admin", "/admin/apis/new", "/admin/submissions", "/admin/review-queue"]) {
    await page.goto(protectedPath);
    await expect(page).toHaveURL(/\/admin\/login\?error=not-authorized/);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  }
});
