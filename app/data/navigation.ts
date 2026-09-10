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
    href: "/school/academics",
    status: "active",
    evidence: "Approved CBSE profile bound to EVD-2026-001",
  },
  {
    label: "Junior College",
    href: "/junior-college",
    status: "active",
    evidence: "Approved Maharashtra Board profile bound to EVD-2026-002",
  },
  {
    label: "Institute",
    href: "/programmes/jee-neet",
    status: "active",
    evidence: "Approved NEET profile bound to EVD-2026-003",
  },
] as const;

export const primaryNavigation: NavigationItem[] = [
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
  {
    label: "CBSE School",
    href: "/school/academics",
    pathway: "active",
    children: [
      { label: "Overview", href: "/school", description: "School profile and educational approach" },
      { label: "Verified profile", href: "/school/academics", description: "Approved identity and affiliation facts" },
      { label: "Faculty", href: "/school/faculty", description: "Verified faculty directory" },
      { label: "Facilities", href: "/school/facilities", description: "Campus facilities and resources" },
    ],
  },
  {
    label: "Junior College",
    href: "/junior-college",
    pathway: "active",
    children: [],
  },
  {
    label: "Institute",
    href: "/programmes/jee-neet",
    pathway: "active",
    children: [],
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

export const utilityNavigation = [
  { label: "Mandatory Public Disclosure", href: "/mandatory-public-disclosure" },
  { label: "Contact", href: "/contact" },
] as const;

export const searchableLinks = [
  ...utilityNavigation,
  ...primaryNavigation.flatMap((item) => [
    { label: item.label, href: item.href },
    ...item.children.map(({ label, href }) => ({ label, href })),
  ]),
  { label: "Admissions fees", href: "/admissions/fees" },
  { label: "Admissions FAQ", href: "/admissions/faq" },
  { label: "Visit SSKEMS", href: "/admissions/visit" },
  { label: "RTE admissions", href: "/admissions/rte" },
  { label: "Class IX and XI transfers", href: "/admissions/class-9-and-11-transfers" },
  { label: "Senior-secondary admissions", href: "/admissions/senior-secondary" },
];

export const footerNavigationGroups = [
  {
    title: "School",
    links: [
      { label: "School overview", href: "/school" },
      { label: "Facilities", href: "/school/facilities" },
      { label: "Student life", href: "/student-life" },
      { label: "About SSKEMS", href: "/about" },
    ],
  },
  {
    title: "Programmes",
    links: [
      { label: "CBSE School", href: "/school/academics" },
      { label: "Junior College", href: "/junior-college" },
      { label: "Institute", href: "/programmes/jee-neet" },
    ],
  },
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
