import profilesData from "@/content/programmes-public-profiles.json";

import type { ProgrammesPublicationRoute } from "@/lib/programmes-publication-routes";

export type PublicProgrammeFact = {
  label: string;
  value: string;
};

export type PublicProgrammeGroup = {
  title: string;
  description: string;
  items: string[];
};

export type PublicProgrammeProfile = {
  id: "cbse-school" | "junior-college" | "neet-institute";
  route: ProgrammesPublicationRoute;
  organisationId: string;
  organisationType: "cbse-school" | "junior-college" | "institute";
  displayName: string;
  navigationLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  publicationNote: string;
  facts: PublicProgrammeFact[];
  groups: PublicProgrammeGroup[];
  withheldSections: string[];
  evidenceReferences: string[];
  claimRecordIds: string[];
  seo: {
    title: string;
    description: string;
    canonicalPath: ProgrammesPublicationRoute;
  };
  validUntil: string | null;
};

export const programmesPublicProfilePublication = {
  profileSetId: profilesData.profileSetId,
  approvalReference: profilesData.approvalReference,
  publishedOn: profilesData.publishedOn,
} as const;

export const publicProgrammeProfiles = profilesData.profiles as PublicProgrammeProfile[];

export function isPublicProgrammeProfileCurrent(profile: PublicProgrammeProfile, now = new Date()) {
  return profile.validUntil === null || profile.validUntil >= now.toISOString().slice(0, 10);
}

export function getPublicProgrammeProfile(route: ProgrammesPublicationRoute, now = new Date()) {
  const profile = publicProgrammeProfiles.find((candidate) => candidate.route === route);
  return profile && isPublicProgrammeProfileCurrent(profile, now) ? profile : null;
}

export const publicProgrammeNavigation = publicProgrammeProfiles.map(({ navigationLabel: label, route: href }) => ({
  label,
  href,
}));
