import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api/"],
    },
    sitemap: "https://www.quicklot.fr/sitemap.xml",
  };
}
