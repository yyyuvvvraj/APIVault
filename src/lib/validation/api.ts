import { z } from "zod";

const publicHttpUrl = z.url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}, "Use a valid HTTP or HTTPS URL.");

export const apiSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(180),
  providerName: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(10).max(280),
  description: z.string().trim().max(4_000).optional(),
  homepageUrl: publicHttpUrl,
  documentationUrl: publicHttpUrl.optional(),
  baseUrl: publicHttpUrl.optional(),
  categorySlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(5),
  authMethods: z.array(z.enum([
    "API_KEY",
    "OAUTH2",
    "BEARER_TOKEN",
    "BASIC_AUTH",
    "NONE",
    "CUSTOM",
    "UNKNOWN",
  ])).min(1),
  pricingModel: z.enum(["FREE", "FREEMIUM", "PAID", "OPEN_SOURCE", "UNKNOWN"]),
  pricingSummary: z.string().trim().max(2_000).optional(),
  sourceUrls: z.array(publicHttpUrl).min(1).max(10),
  submitterGithub: z.string().trim().regex(/^[a-zA-Z0-9-]{1,39}$/).optional(),
});

export type ApiSubmissionInput = z.infer<typeof apiSubmissionSchema>;
