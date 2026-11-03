export const CATEGORY_DIRECTORY = [
  { slug: "ai-machine-learning", name: "AI & Machine Learning", description: "Models, inference, embeddings, and AI services." },
  { slug: "developer-tools", name: "Developer Tools", description: "Build, test, deploy, and monitor software." },
  { slug: "data-analytics", name: "Data & Analytics", description: "Data access, analytics, and business intelligence." },
  { slug: "finance", name: "Finance", description: "Financial data, payments, banking, and markets." },
  { slug: "communication", name: "Communication", description: "Email, messaging, voice, and collaboration." },
  { slug: "maps-geospatial", name: "Maps & Geospatial", description: "Maps, geocoding, routing, and location data." },
  { slug: "productivity", name: "Productivity", description: "Workflows, documents, scheduling, and automation." },
  { slug: "media", name: "Media", description: "Images, video, audio, and content services." },
  { slug: "weather-environment", name: "Weather & Environment", description: "Weather, climate, and environmental data." },
  { slug: "science-education", name: "Science & Education", description: "Research, learning, and scientific datasets." },
] as const;

export const PRICING_OPTIONS = [
  { value: "FREE", label: "Free" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "PAID", label: "Paid" },
  { value: "OPEN_SOURCE", label: "Open source" },
  { value: "UNKNOWN", label: "Not yet known" },
] as const;

export const AUTH_OPTIONS = [
  { value: "API_KEY", label: "API key" },
  { value: "OAUTH2", label: "OAuth 2.0" },
  { value: "BEARER_TOKEN", label: "Bearer token" },
  { value: "BASIC_AUTH", label: "Basic auth" },
  { value: "NONE", label: "No authentication" },
  { value: "CUSTOM", label: "Custom" },
  { value: "UNKNOWN", label: "Not yet known" },
] as const;
