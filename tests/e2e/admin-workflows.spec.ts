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
  await page.getByLabel(/Documentation URL/).fill("https://e2e-lifecycle.example.test/docs");
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


test("moderator records the full review lifecycle and approval keeps the API unpublished pending verification", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in to APIVault" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);

  await page.goto("/admin/submissions");
  const submission = page.locator("article").filter({ hasText: "E2E Approval Community Member" });
  await expect(submission).toBeVisible();

  await submission.locator('select[name="nextStatus"]').selectOption("IN_REVIEW");
  await submission.getByRole("button", { name: "Save review decision" }).click();
  await expect(submission).toContainText("IN REVIEW");
  await expect(submission.getByRole("region", { name: "Moderation audit history" })).toContainText("PENDING → IN REVIEW");

  await submission.locator('select[name="nextStatus"]').selectOption("CHANGES_REQUESTED");
  await submission.locator('textarea[name="reviewNote"]').fill("Please provide clearer pricing evidence.");
  await submission.getByRole("button", { name: "Save review decision" }).click();
  await expect(submission).toContainText("CHANGES REQUESTED");
  await expect(submission.getByRole("region", { name: "Moderation audit history" })).toContainText("IN REVIEW → CHANGES REQUESTED");

  await submission.locator('select[name="nextStatus"]').selectOption("IN_REVIEW");
  await submission.locator('textarea[name="reviewNote"]').fill("Updated evidence reviewed.");
  await submission.getByRole("button", { name: "Save review decision" }).click();
  await expect(submission).toContainText("IN REVIEW");
  await expect(submission.getByRole("region", { name: "Moderation audit history" })).toContainText("CHANGES REQUESTED → IN REVIEW");

  await submission.getByLabel("Approval note (optional)").fill("Evidence reviewed; approve for verification queue.");
  await submission.getByRole("button", { name: "Approve and apply to catalogue" }).click();
  await expect(submission).toContainText("Submission approved and applied to /e2e-approval-lifecycle-api. The API remains hidden pending verification.");
  await expect(submission).toContainText("APPROVED");
  await expect(submission.getByRole("region", { name: "Moderation audit history" })).toContainText("IN REVIEW → APPROVED");

  const publicApiResponse = await page.request.get("/api/v1/apis/e2e-approval-lifecycle-api");
  expect(publicApiResponse.status()).toBe(404);

  await page.goto("/admin/review-queue");
  const pendingApi = page.locator("article").filter({ hasText: "E2E Approval Lifecycle API" });
  await expect(pendingApi).toBeVisible();
  await expect(pendingApi).toContainText("Pending review");
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


test("contributor can submit an API, track it privately, and control public profile visibility", async ({ page }) => {
  const userEmail = process.env.E2E_USER_EMAIL ?? "apivault-user-e2e@example.test";
  const userPassword = process.env.E2E_USER_PASSWORD ?? "E2E-user-only-password-12345";
  const handle = "e2e-contributor";

  await page.goto("/account/login");
  await page.getByLabel("Email address").fill(userEmail);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Sign in to APIVault" }).click();
  await expect(page).toHaveURL(/\/account(?:\?.*)?$/);

  await page.goto("/submit");
  await page.getByLabel("API name").fill("E2E Contributor Submission API");
  await page.getByLabel("Provider").fill("E2E Contributor Provider");
  await page.getByLabel("Short summary").fill("An API submitted by a contributor browser test.");
  await page.getByLabel("Official API homepage").fill("https://contributor-api.example.test");
  await page.getByLabel("Documentation URL").fill("https://contributor-api.example.test/docs");
  await page.getByLabel("Category slugs (comma separated)").fill("e2e-testing");
  await page.getByLabel("Authentication methods").fill("API_KEY");
  await page.getByLabel("Pricing model").selectOption("FREEMIUM");
  await page.getByLabel("Official source URLs (one per line)").fill("https://contributor-api.example.test/pricing");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("status")).toContainText("Submission received");

  await page.goto("/account/submissions");
  const ownSubmission = page.locator("article").filter({ hasText: "E2E Contributor Submission API" });
  await expect(ownSubmission).toBeVisible();
  await expect(ownSubmission).toContainText("PENDING");

  await page.goto("/account/profile");
  await page.getByLabel("Public handle").fill(handle);
  await page.getByLabel("Display name").fill("E2E Public Contributor");
  await page.getByLabel("Bio (280 characters)").fill("Contributor profile visibility is covered by an end-to-end test.");
  await page.getByLabel("Website URL (HTTPS)").fill("https://contributor.example.test");
  await page.getByLabel("GitHub profile URL").fill("https://github.com/e2e-contributor");
  await page.getByLabel(/Make profile public/).check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");

  await page.goto(`/contributors/${handle}`);
  await expect(page.getByRole("heading", { name: "E2E Public Contributor" })).toBeVisible();
  await expect(page.getByText("Contributor profile visibility is covered by an end-to-end test.")).toBeVisible();

  const publicProfileResponse = await page.request.get(`/api/contributors/${handle}`);
  expect(publicProfileResponse.status()).toBe(200);
  const publicProfile = await publicProfileResponse.json();
  expect(publicProfile.data).toMatchObject({
    handle,
    displayName: "E2E Public Contributor",
    approvedContributions: 0,
  });
  expect(JSON.stringify(publicProfile.data)).not.toContain(userEmail);
  expect(publicProfile.data).not.toHaveProperty("userId");
  expect(publicProfile.data).not.toHaveProperty("email");

  await page.goto("/account/profile");
  await page.getByLabel(/Make profile public/).uncheck();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");

  const privateProfileResponse = await page.request.get(`/api/contributors/${handle}`);
  expect(privateProfileResponse.status()).toBe(404);
  const privatePageResponse = await page.request.get(`/contributors/${handle}`);
  expect(privatePageResponse.status()).toBe(404);
});
