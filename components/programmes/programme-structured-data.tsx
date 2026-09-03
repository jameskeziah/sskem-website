import {
  serializeProgrammeJsonLd,
  type ProgrammeSeoResult,
} from "@/lib/programmes-seo";

export function ProgrammeStructuredData({ seo }: Readonly<{ seo: ProgrammeSeoResult }>) {
  if (!seo.ok || !seo.structuredData.graph) return null;

  return (
    <script
      id={`programme-structured-data-${seo.route.replaceAll("/", "-").replace(/^-/, "")}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeProgrammeJsonLd(seo.structuredData.graph) }}
    />
  );
}
