import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/agent/",
          "/file/",
          "/portal/",
          "/module/",
          "/admin/",
          "/super-admin/",
        ],
      },
    ],
    sitemap: "https://recruitment.orbitoverseas.com/sitemap.xml",
  };
}
