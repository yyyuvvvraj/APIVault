import { z } from "zod";

const httpUrl = z.url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}, "Use a valid HTTP or HTTPS URL.");

const optionalHttpUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  httpUrl.optional(),
);

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const adminCreateApiSchema = z.object({
  name: z.string().trim().min(2, "Enter an API name.").max(180),
  providerName: z.string().trim().min(2, "Enter a provider name.").max(160),
  summary: z.string().trim().min(10, "Write a summary of at least 10 characters.").max(280),
  description: optionalText(4_000),
  homepageUrl: httpUrl,
  documentationUrl: optionalHttpUrl,
  baseUrl: optionalHttpUrl,
  categorySlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1, "Choose at least one category.").max(5)
    .refine((values) => new Set(values).size === values.length, "Choose each category only once."),
  authMethods: z.array(z.enum([
    "API_KEY",
    "OAUTH2",
    "BEARER_TOKEN",
    "BASIC_AUTH",
    "NONE",
    "CUSTOM",
    "UNKNOWN",
  ])).min(1, "Choose at least one authentication method."),
  pricingModel: z.enum(["FREE", "FREEMIUM", "PAID", "OPEN_SOURCE", "UNKNOWN"]),
  pricingSummary: optionalText(2_000),
});

export type AdminCreateApiInput = z.infer<typeof adminCreateApiSchema>;
