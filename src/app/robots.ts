import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/admin",
          "/api/admin/*",
          "/*/impressum",
          "/*/datenschutz",
        ],
      },
    ],
    sitemap: "https://dimissio.eu/sitemap.xml",
  };
}
