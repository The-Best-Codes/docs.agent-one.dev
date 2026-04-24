import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const baseUrl = "https://docs.agent-one.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  return [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...pages.map((page) => ({
      url: `${baseUrl}${page.url}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
