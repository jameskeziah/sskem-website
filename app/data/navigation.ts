import { getCurrentPublicProgrammeProfiles } from "./programmes-public-profiles";
import { getProgrammePublicationDay } from "@/lib/programme-publication-window.mjs";

export type NavigationChild = {
  label: string;
  href: string;
  description: string;
};

export type NavigationItem = {
  label: string;
  href: string;
  children: NavigationChild[];
  pathway?: "active" | "pending";
};

export type NavigationLink = {
  label: string;
  href: string;
};

export type FooterNavigationGroup = {
  title: string;
  links: NavigationLink[];
};

export type PublicationNavigationSnapshot = {
  asOfDate: string;
  primaryNavigation: NavigationItem[];
  searchableLinks: NavigationLink[];
  footerNavigationGroups: FooterNavigationGroup[];
  programmeLinks: NavigationLink[];
};

const fixedPrimaryStart: NavigationItem[] = [
  {
    label: "Home",
    href: "/",
    children: [],
  },
  {
    label: "About Us",
    href: "/about",
    children: [
      { label: "School overview", href: "/about/school-overview", description: "History, purpose and profile" },
      { label: "Leadership", href: "/about/leadership", description: "Leadership and messages" },
      { label: "Governance", href: "/about/governance", description: "Management and statutory committees" },
      { label: "Achievements", href: "/about/achievements", description: "Verified student and school outcomes" },
      { label: "News & media", href: "/about/news", description: "Updates and press coverage" },
    ],
  },
];

const fixedPrimaryEnd: NavigationItem[] = [
  {
    label: "Student Life",
    href: "/student-life",
    children: [
      { label: "Clubs", href: "/student-life/clubs", description: "Co-curricular communities" },
      { label: "Uniform", href: "/student-life/uniform", description: "Current uniform guidance" },
      { label: "Calendar", href: "/student-life/calendar", description: "Academic and event calendar" },
      { label: "Gallery", href: "/student-life/gallery", description: "School life in photographs" },
    ],
  },
  {
    label: "Admissions",
    href: "/admissions",
    children: [
      { label: "Process", href: "/admissions/process", description: "Admission steps and documents" },
      { label: "Age criteria", href: "/admissions/age-criteria", description: "Academic-year eligibility guidance" },
      { label: "Documents", href: "/admissions/documents-required", description: "Conditional document checklist" },
      { label: "Enquire", href: "/admissions/enquire", description: "Ask the admissions team" },
      { label: "Apply", href: "/admissions/apply", description: "Formal application journey" },
      { label: "Application status", href: "/admissions/application-status", description: "Secure parent tracking" },
    ],
  },
];

const schoolProgrammeChildren: NavigationChild[] = [
  { label: "Overview", href: "/school", description: "School profile and educational approach" },
  { label: "Verified profile", href: "/school/academics", description: "Approved identity and affiliation facts" },
  { label: "Faculty", href: "/school/faculty", description: "Verified faculty directory" },
  { label: "Facilities", href: "/school/facilities", description: "Campus facilities and resources" },
];

export const utilityNavigation = [
  { label: "Mandatory Public Disclosure", href: "/mandatory-public-disclosure" },
  { label: "Contact", href: "/contact" },
] as const;

const additionalSearchLinks: NavigationLink[] = [
  { label: "Admissions fees", href: "/admissions/fees" },
  { label: "Admissions FAQ", href: "/admissions/faq" },
  { label: "Visit SSKEMS", href: "/admissions/visit" },
  { label: "RTE admissions", href: "/admissions/rte" },
  { label: "Class IX and XI transfers", href: "/admissions/class-9-and-11-transfers" },
  { label: "Senior-secondary admissions", href: "/admissions/senior-secondary" },
];

function cloneNavigationItem(item: NavigationItem): NavigationItem {
  return { ...item, children: item.children.map((child) => ({ ...child })) };
}

function programmeNavigationItems(now: Date): NavigationItem[] {
  return getCurrentPublicProgrammeProfiles(now).map((profile) => ({
    label: profile.navigationLabel,
    href: profile.route,
    pathway: "active",
    children: profile.organisationType === "cbse-school"
      ? schoolProgrammeChildren.map((child) => ({ ...child }))
      : [],
  }));
}

function uniqueLinks(links: NavigationLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

export function getPublicationNavigation(now = new Date()): PublicationNavigationSnapshot {
  const programmeItems = programmeNavigationItems(now);
  const programmeLinks = programmeItems.map(({ label, href }) => ({ label, href }));
  const primaryNavigation = [
    ...fixedPrimaryStart.map(cloneNavigationItem),
    ...programmeItems,
    ...fixedPrimaryEnd.map(cloneNavigationItem),
  ];
  const searchableLinks = uniqueLinks([
    ...utilityNavigation,
    ...primaryNavigation.flatMap((item) => [
      { label: item.label, href: item.href },
      ...item.children.map(({ label, href }) => ({ label, href })),
    ]),
    ...additionalSearchLinks,
  ]);
  const footerNavigationGroups: FooterNavigationGroup[] = [
    {
      title: "School",
      links: [
        { label: "School overview", href: "/school" },
        { label: "Facilities", href: "/school/facilities" },
        { label: "Student life", href: "/student-life" },
        { label: "About SSKEMS", href: "/about" },
      ],
    },
    ...(programmeLinks.length ? [{ title: "Programmes", links: programmeLinks }] : []),
    {
      title: "Admissions",
      links: [
        { label: "Admissions overview", href: "/admissions" },
        { label: "Admission process", href: "/admissions/process" },
        { label: "Documents required", href: "/admissions/documents-required" },
        { label: "Enquire now", href: "/admissions/enquire" },
      ],
    },
    {
      title: "Public information",
      links: [
        ...utilityNavigation,
        { label: "Documents", href: "/documents" },
        { label: "Historical documents", href: "/documents/archive" },
      ],
    },
  ];

  return {
    asOfDate: getProgrammePublicationDay(now),
    primaryNavigation,
    searchableLinks,
    footerNavigationGroups,
    programmeLinks,
  };
}
