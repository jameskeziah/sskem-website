import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PrivateProgrammeRouteShell, privateProgrammeRouteShellSpec } from "@/components/programmes/private-programme-route-shell";

const route = "/junior-college" as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Junior College Route Shell",
  description: "Private SSKEMS review shell for the future Junior College route.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function JuniorCollegeRouteShellPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser(route);

  return <PrivateProgrammeRouteShell spec={privateProgrammeRouteShellSpec(route)} />;
}
