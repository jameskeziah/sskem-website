import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PrivateProgrammeRouteShell, privateProgrammeRouteShellSpec } from "@/components/programmes/private-programme-route-shell";

const route = "/programmes/jee-neet" as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "JEE and NEET Route Shell",
  description: "Private SSKEMS review shell for the future JEE and NEET programme route.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function JeeNeetRouteShellPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser(route);

  return <PrivateProgrammeRouteShell spec={privateProgrammeRouteShellSpec(route)} />;
}
