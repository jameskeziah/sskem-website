import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PrivateProgrammeRouteShell, privateProgrammeRouteShellSpec } from "@/components/programmes/private-programme-route-shell";

const route = "/school/academics" as const;

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
    return { title: "Page not found", description: "The requested SSKEMS page is not publicly available.", robots: { index: false, follow: false, nocache: true } };
  }
  return { title: "School Academics Route Shell", description: "Private SSKEMS review shell for the future School academics route.", robots: { index: false, follow: false, nocache: true } };
}

export default async function SchoolAcademicsRouteShellPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser(route);

  return <PrivateProgrammeRouteShell spec={privateProgrammeRouteShellSpec(route)} />;
}
