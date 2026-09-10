import type { MetadataRoute } from "next";

import { documentCategories, publicDocuments } from "./data/documents";

const origin = "https://www.sskemschool.com";

const admissionsPaths = [
  "/admissions",
  "/admissions/process",
  "/admissions/age-criteria",
  "/admissions/enquire",
  "/admissions/apply",
  "/admissions/application-status",
  "/admissions/documents-required",
  "/admissions/fees",
  "/admissions/faq",
  "/admissions/contact",
  "/admissions/rte",
  "/admissions/class-9-and-11-transfers",
  "/admissions/school",
  "/admissions/senior-secondary",
  "/admissions/visit",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/school/academics",
    "/junior-college",
    "/programmes/jee-neet",
    ...admissionsPaths,
    "/mandatory-public-disclosure",
    "/mandatory-public-disclosure/teaching-staff",
    "/mandatory-public-disclosure/infrastructure-inspection",
    "/documents",
    "/documents/archive",
    ...documentCategories.map((category) => `/documents/${category.slug}`),
    ...publicDocuments.flatMap((document) => [`/documents/${document.slug}`, `/documents/${document.slug}/versions`]),
  ];
  return paths.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "monthly",
    priority: path === "/mandatory-public-disclosure" || path === "/admissions" ? 1 : 0.7,
  }));
}
