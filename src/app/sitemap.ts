import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { toolsConfig } from "@/config/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes = toolsConfig.map((tool) => ({
    url: `${siteConfig.url}${tool.href}`,
    lastModified: new Date("2026-10-18"),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticRoutes = [
    "",
    "/about",
    "/privacy-policy",
    "/terms",
    "/contact",
  ].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date("2026-10-18"),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1.0 : 0.5,
  }));

  return [...staticRoutes, ...toolRoutes];
}
