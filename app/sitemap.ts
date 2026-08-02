import type { MetadataRoute } from "next";

import { documentCategories, publicDocuments } from "./data/documents";

const origin = "https://www.sskemschool.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/mandatory-public-disclosure",
    "/mandatory-public-disclosure/teaching-staff",
    "/mandatory-public-disclosure/infrastructure-inspection",
    "/documents",
    "/documents/archive",
    ...documentCategories.map((category) => `/documents/${category.slug}`),
    ...publicDocuments.flatMap((document) => [`/documents/${document.slug}`, `/documents/${document.slug}/versions`]),
  ];
  return paths.map((path) => ({ url: `${origin}${path}`, changeFrequency: "monthly", priority: path === "/mandatory-public-disclosure" ? 1 : 0.7 }));
}
