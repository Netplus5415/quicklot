import { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticles();
  const articleEntries = articles.map((a) => ({
    url: `https://www.quicklot.fr/blog/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [
    { url: "https://www.quicklot.fr", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: "https://www.quicklot.fr/boutique", lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: "https://www.quicklot.fr/blog", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: "https://www.quicklot.fr/vendeurs", lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: "https://www.quicklot.fr/a-propos", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    ...articleEntries,
  ];
}
