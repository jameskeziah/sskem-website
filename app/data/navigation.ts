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

export const institutionPathways = [
  {
    label: "CBSE School",
    href: "/school",
    status: "active",
    evidence: "Current public site and affiliation number 1130851",
  },
  {
    label: "Junior College",
    href: "/junior-college",
    status: "pending",
    evidence: "Named publicly, but no verified dedicated content inventory",
  },
  {
    label: "Institute",
    href: "/institute",
    status: "pending",
    evidence: "Legacy NEET-focused page requires management confirmation",
  },
] as const;

export const primaryNavigation: NavigationItem[] = [
  {
    label: "School",
    href: "/school",
    pathway: "active",
    children: [
      { label: "Overview", href: "/school", description: "School profile and educational approach" },
      { label: "Academics", href: "/school/academics", description: "Curriculum, calendar and learning" },
      { label: "Faculty", href: "/school/faculty", description: "Verified faculty directory" },
      { label: "Facilities", href: "/school/facilities", description: "Campus facilities and resources" },
    ],
  },
  {
    label: "Admissions",
    href: "/admissions",
    children: [
      { label: "Process", href: "/admissions/process", description: "Admission steps and documents" },
      { label: "Age criteria", href: "/admissions/age-criteria", description: "Academic-year eligibility guidance" },
      { label: "Fees", href: "/admissions/fees", description: "Approved fee information" },
      { label: "Enquire", href: "/admissions/enquire", description: "Ask the admissions team" },
      { label: "Apply", href: "/admissions/apply", description: "Application guidance" },
    ],
  },
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
    label: "About",
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

export const utilityNavigation = [
  { label: "Mandatory Public Disclosure", href: "/mandatory-public-disclosure" },
  { label: "Documents", href: "/documents" },
  { label: "Contact", href: "/contact" },
] as const;

export const searchableLinks = [
  ...utilityNavigation,
  ...primaryNavigation.flatMap((item) => [
    { label: item.label, href: item.href },
    ...item.children.map(({ label, href }) => ({ label, href })),
  ]),
];
