import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://apivault-beta.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/apis`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/discover`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/docs`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
