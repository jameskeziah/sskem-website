import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getPublicProgrammeProfile } from "@/app/data/programmes-public-profiles";
import { PublicProgrammeProfilePage } from "@/components/programmes/public-programme-profile";

import "../../programmes.css";

const route = "/school/academics" as const;

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const profile = getPublicProgrammeProfile(route);
  if (!profile) return { title: "Page not found", robots: { index: false, follow: false } };
  return {
    title: profile.seo.title,
    description: profile.seo.description,
    alternates: { canonical: profile.seo.canonicalPath },
    robots: process.env.HOMEPAGE_REVIEW_MODE === "private"
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export default async function SchoolAcademicsPage() {
  const profile = getPublicProgrammeProfile(route);
  if (!profile) notFound();
  const privatePreview = process.env.HOMEPAGE_REVIEW_MODE === "private";
  if (privatePreview) await requireChatGPTUser(route);

  return <PublicProgrammeProfilePage profile={profile} privatePreview={privatePreview} />;
}
