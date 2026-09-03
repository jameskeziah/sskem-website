import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  Accordion,
  Alert,
  ContactCard,
  EmptyState,
  GalleryCard,
  ProgrammeCard,
} from "@/components/content";
import {
  Cluster,
  Grid,
  PageContainer,
  ReadingContainer,
  Section,
  Stack,
} from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Caption,
  Eyebrow,
  Heading,
  Lead,
  List,
  Text,
  TextLink,
} from "@/components/typography";
import {
  institutionPathways,
  primaryNavigation,
  utilityNavigation,
} from "@/app/data/navigation";
import {
  legacyCatchAllRedirects,
  legacyCatchAllRedirectTarget,
} from "@/app/data/legacy-cutover";
import { siteFacts } from "@/app/data/site";
import { isProgrammesPublicationRoute } from "@/lib/programmes-publication-routes";

type PageSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type PageSpec = {
  eyebrow: string;
  title: string;
  summary: string;
  notice?: string;
  sections: PageSection[];
};

type RouteProps = {
  params: Promise<{ slug: string[] }>;
};

const awaitingVerification =
  "This page is part of the new website foundation. Detailed school content is being checked against approved records before publication.";

const pageSpecs: Record<string, PageSpec> = {
  "/school": {
    eyebrow: "Confirmed institutional pathway",
    title: "CBSE School",
    summary:
      "A clear starting point for families looking for the school profile, academic information, faculty details and campus facilities.",
    sections: [
      {
        title: "Verified baseline",
        paragraphs: [
          `${siteFacts.name} is located in ${siteFacts.location}. The public affiliation number recorded for the school is ${siteFacts.affiliationNumber}.`,
          "Curriculum, grade-range and programme claims will be added only after management approves the source material.",
        ],
      },
    ],
  },
  "/school/academics": {
    eyebrow: "School",
    title: "Academics",
    summary:
      "The future home for approved curriculum, learning approach, assessment and academic-calendar information.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Information being prepared",
        paragraphs: [
          "The academic team is being asked to verify the current grade structure, subjects, assessment pattern and calendar before these details are published.",
        ],
        bullets: [
          "Grade and subject overview",
          "Teaching and assessment approach",
          "Academic calendar and important dates",
          "Learning support and enrichment",
        ],
      },
    ],
  },
  "/school/faculty": {
    eyebrow: "School",
    title: "Faculty",
    summary:
      "A faculty directory will appear here after names, roles, departments and qualifications have been checked and approved.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Publication standard",
        paragraphs: [
          "Only current staff information supplied or approved by the school will be published. Personal details beyond the approved professional profile will not be shown.",
        ],
      },
    ],
  },
  "/school/facilities": {
    eyebrow: "School",
    title: "Facilities",
    summary:
      "The planned facilities guide will help families understand the campus using verified descriptions and current photographs.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Content being checked",
        paragraphs: [
          "Campus descriptions, accessibility information, safety details and image captions require a current on-site review before publication.",
        ],
      },
    ],
  },
  "/admissions": {
    eyebrow: "For prospective families",
    title: "Admissions",
    summary:
      "Start an enquiry, review the planned admission guidance and contact the school for the latest approved dates and requirements.",
    sections: [
      {
        title: "Use confirmed information",
        paragraphs: [
          "Admission dates, availability, eligibility, documents and fees can change by academic year. Please contact the school until the current admissions notice is approved for publication.",
        ],
      },
    ],
  },
  "/admissions/process": {
    eyebrow: "Admissions",
    title: "Admission process",
    summary:
      "A simple, step-by-step process will be published here once the current academic-year workflow is approved.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Before you apply",
        paragraphs: [
          "Please enquire directly for current availability, grade eligibility, required documents, deadlines and the authorised application method.",
        ],
      },
    ],
  },
  "/admissions/age-criteria": {
    eyebrow: "Admissions",
    title: "Age criteria",
    summary:
      "Academic-year-specific age guidance will be shown here after it is verified against the applicable admission rules.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Why the table is not yet published",
        paragraphs: [
          "Age cut-off dates must be exact. Publishing an older or unapproved table could mislead a family, so the school office remains the current source of guidance.",
        ],
      },
    ],
  },
  "/admissions/fees": {
    eyebrow: "Admissions",
    title: "Fees",
    summary:
      "Approved fee information and clear notes about what each charge covers will be published here when verified.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Request the current fee information",
        paragraphs: [
          "No fee amount is displayed until the relevant academic year, approving authority and effective date have been confirmed.",
        ],
      },
    ],
  },
  "/admissions/enquire": {
    eyebrow: "Admissions",
    title: "Enquire now",
    summary:
      "Speak with the school office about admissions, eligibility, availability or the documents you may need.",
    sections: [
      {
        title: "What to include",
        paragraphs: [
          "To help the team respond, include the student's intended grade, the academic year and a reliable phone number in your email.",
        ],
      },
    ],
  },
  "/admissions/apply": {
    eyebrow: "Admissions",
    title: "Application guidance",
    summary:
      "The verified application route will be published here. For now, begin with an enquiry to avoid using an outdated form.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Application status",
        paragraphs: [
          "The current website inventory contains legacy forms that require validation. The new site will not collect application data until ownership, fields, consent text and delivery have been approved.",
        ],
      },
    ],
  },
  "/student-life": {
    eyebrow: "Beyond the classroom",
    title: "Student life",
    summary:
      "A practical hub for co-curricular activities, uniform guidance, school dates and approved photo stories.",
    sections: [
      {
        title: "Built for useful updates",
        paragraphs: [
          "This section will prioritise information families need to act on. Activities, dates and images will carry enough context to remain useful and trustworthy.",
        ],
      },
    ],
  },
  "/student-life/clubs": {
    eyebrow: "Student life",
    title: "Clubs and activities",
    summary:
      "Current co-curricular clubs, participation guidance and staff contacts will be listed after school review.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Directory in preparation",
        paragraphs: [
          "Club names, age groups, meeting schedules and participation details are time-sensitive and are therefore awaiting confirmation.",
        ],
      },
    ],
  },
  "/student-life/uniform": {
    eyebrow: "Student life",
    title: "School uniform",
    summary:
      "Approved uniform guidance, seasonal notes and purchasing information will be placed here when verified.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Current guidance",
        paragraphs: [
          "Please contact the school office before purchasing. Images and specifications from the legacy site have not yet been accepted as current.",
        ],
      },
    ],
  },
  "/student-life/calendar": {
    eyebrow: "Student life",
    title: "Calendar",
    summary:
      "The published calendar will distinguish academic dates, holidays, examinations and school events.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Dates awaiting approval",
        paragraphs: [
          "No event date is being carried over without confirmation of its academic year and source. Contact the office for the current schedule.",
        ],
      },
    ],
  },
  "/student-life/gallery": {
    eyebrow: "Student life",
    title: "Gallery",
    summary:
      "Approved school photographs will be organised as dated, captioned stories rather than an unlabelled image archive.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Media review",
        paragraphs: [
          "Images are being checked for relevance, quality, consent and accurate captions before they are migrated.",
        ],
      },
    ],
  },
  "/about": {
    eyebrow: "About SSKEMS",
    title: "About the school",
    summary:
      "Find the verified school profile, leadership, governance, achievements and latest approved updates.",
    sections: [
      {
        title: "A source-led profile",
        paragraphs: [
          `The new profile starts with the confirmed school name, location and affiliation number ${siteFacts.affiliationNumber}. Historical and institutional claims will follow after documentary review.`,
        ],
      },
    ],
  },
  "/about/school-overview": {
    eyebrow: "About SSKEMS",
    title: "School overview",
    summary:
      "A concise profile of the school and its governing trust, limited to facts that can be supported by current records.",
    sections: [
      {
        title: "Public baseline",
        paragraphs: [
          `${siteFacts.name} is associated with ${siteFacts.trust} and is based in ${siteFacts.location}.`,
          siteFacts.factStatus,
        ],
      },
    ],
  },
  "/about/leadership": {
    eyebrow: "About SSKEMS",
    title: "Leadership",
    summary:
      "Approved leadership profiles and signed messages will appear here after names, roles and copy are confirmed.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Profile review",
        paragraphs: [
          "The new directory will show only current office-holders and role-appropriate professional information approved for public use.",
        ],
      },
    ],
  },
  "/about/governance": {
    eyebrow: "About SSKEMS",
    title: "Governance",
    summary:
      "The governance page will present current management and statutory committee information with source dates.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Records required",
        paragraphs: [
          "Committee membership, terms and statutory documents will not be inferred from older pages. Current approved records are required before publication.",
        ],
      },
    ],
  },
  "/about/achievements": {
    eyebrow: "About SSKEMS",
    title: "Achievements",
    summary:
      "Verified student and school achievements will be published with dates, categories and enough context to understand each result.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Evidence before claims",
        paragraphs: [
          "Results and awards are awaiting source review. Older highlights will not be presented as recent achievements without dates and supporting records.",
        ],
      },
    ],
  },
  "/about/news": {
    eyebrow: "About SSKEMS",
    title: "News and media",
    summary:
      "Dated school notices, stories and relevant media coverage will be organised here when the publishing workflow is ready.",
    notice: awaitingVerification,
    sections: [
      {
        title: "Publishing standard",
        paragraphs: [
          "Every update will identify its publication date and content owner. Time-sensitive notices will be archived or marked when no longer current.",
        ],
      },
    ],
  },
  "/contact": {
    eyebrow: "Contact SSKEMS",
    title: "Contact",
    summary:
      "Use the public school contact details below for admissions, general enquiries and official correspondence.",
    sections: [
      {
        title: "Visit or write",
        paragraphs: [
          `${siteFacts.name}, ${siteFacts.location}. The postal PIN is intentionally omitted while the conflicting source records are resolved.`,
        ],
      },
    ],
  },
  "/privacy": {
    eyebrow: "Website policy",
    title: "Privacy notice",
    summary:
      "An interim explanation of how the Phase 1 website handles information while forms and analytics remain under review.",
    sections: [
      {
        title: "Phase 1 data handling",
        paragraphs: [
          "This foundation site does not provide an online admission form or publish a student directory. Email and phone enquiries are handled through the contact channels selected by the visitor.",
          "A complete privacy notice covering approved forms, service providers, retention, cookies and enquiry rights must be reviewed before those features launch.",
        ],
      },
      {
        title: "Questions about personal information",
        paragraphs: [
          `For a privacy-related question, contact ${siteFacts.email}. Do not send sensitive student records through an unverified form or public message.`,
        ],
      },
    ],
  },
  "/accessibility": {
    eyebrow: "Website policy",
    title: "Accessibility statement",
    summary:
      "The Phase 1 interface is being built for keyboard access, readable zoom, visible focus and reduced-motion preferences.",
    sections: [
      {
        title: "Current status",
        paragraphs: [
          "The rebuilt component system targets WCAG 2.2 AA patterns, but a full content and assistive-technology audit is still required before a formal conformance claim can be made.",
        ],
        bullets: [
          "Keyboard-operable navigation and dialogs",
          "A skip link and landmark-based page structure",
          "Visible focus and semantic headings",
          "Reduced-motion support in the shared tokens",
        ],
      },
      {
        title: "Report a barrier",
        paragraphs: [
          `If something prevents you from using this website, email ${siteFacts.email} and include the page address and a brief description of the problem.`,
        ],
      },
    ],
  },
  "/junior-college": {
    eyebrow: "Pathway awaiting confirmation",
    title: "Junior College",
    summary:
      "This institutional pathway is named in public material, but its current scope and dedicated website content have not yet been confirmed.",
    notice:
      "Junior College is intentionally excluded from primary navigation until management confirms that it is active and supplies approved content.",
    sections: [
      {
        title: "Need current information?",
        paragraphs: [
          "Contact the school office rather than relying on legacy descriptions, dates or programme details.",
        ],
      },
    ],
  },
  "/institute": {
    eyebrow: "Pathway awaiting confirmation",
    title: "Institute",
    summary:
      "Legacy institute material requires management review before this pathway can be presented as a current offering.",
    notice:
      "Institute is intentionally excluded from primary navigation until its status, ownership and programme information are confirmed.",
    sections: [
      {
        title: "Need current information?",
        paragraphs: [
          "Please contact the school office. No course, examination-preparation or admission claim from an older page is repeated here as current fact.",
        ],
      },
    ],
  },
};

const allKnownPaths = new Set([
  ...institutionPathways.map((item) => item.href),
  ...primaryNavigation.flatMap((item) => [
    item.href,
    ...item.children.map((child) => child.href),
  ]),
  ...utilityNavigation.filter((item) => item.href === "/contact").map((item) => item.href),
  "/privacy",
  "/accessibility",
].filter((path) => !isProgrammesPublicationRoute(path)));

function childLinksFor(path: string) {
  return primaryNavigation.find((item) => item.href === path)?.children ?? [];
}

function PageActions() {
  return (
    <Cluster className="route-page__actions">
      <TextLink className="button button--primary" href="/admissions/enquire">
        Enquire now
      </TextLink>
      <TextLink className="button button--secondary" href="/mandatory-public-disclosure">
        Public disclosure
      </TextLink>
    </Cluster>
  );
}

function SpecialContent({ path }: { path: string }): ReactNode {
  if (path === "/contact" || path === "/admissions/enquire") {
    return (
      <Section tone="subtle" aria-labelledby="contact-options-title">
        <PageContainer>
          <Stack gap="24">
            <Heading as="h2" level="section" id="contact-options-title">
              Contact options
            </Heading>
            <Grid min="card">
              <ContactCard
                title="School office"
                phone={siteFacts.phone}
                email={siteFacts.email}
                hours={`${siteFacts.workingHours.weekdays}; ${siteFacts.workingHours.saturday}`}
              />
              <ContactCard
                title="Principal's office"
                phone={siteFacts.mobile}
                email={siteFacts.principalEmail}
                hours="Please contact the office to arrange a suitable time"
              />
            </Grid>
            <Caption>{siteFacts.factStatus}</Caption>
          </Stack>
        </PageContainer>
      </Section>
    );
  }

  if (path === "/student-life/gallery") {
    return (
      <Section tone="subtle" aria-labelledby="gallery-preview-title">
        <PageContainer>
          <Stack gap="24">
            <Heading as="h2" level="section" id="gallery-preview-title">
              Gallery preview
            </Heading>
            <Grid min="card">
              <GalleryCard title="Campus photographs" meta="Selection and captions pending" />
              <GalleryCard title="Student activities" meta="Consent and event details pending" />
              <GalleryCard title="School events" meta="Dates and captions pending" />
            </Grid>
          </Stack>
        </PageContainer>
      </Section>
    );
  }

  if (path === "/school/faculty" || path === "/about/leadership") {
    return (
      <Section tone="subtle" aria-labelledby="directory-status-title">
        <PageContainer>
          <Stack gap="24">
            <Heading as="h2" level="section" id="directory-status-title">
              Directory status
            </Heading>
            <EmptyState
              title="Profiles awaiting approval"
              description="No names or credentials will be inferred from legacy pages. The approved directory will replace this status panel."
            />
          </Stack>
        </PageContainer>
      </Section>
    );
  }

  if (path === "/privacy") {
    return (
      <Section tone="subtle" aria-labelledby="privacy-questions-title">
        <ReadingContainer>
          <Accordion
            items={[
              {
                title: "Does this phase collect application details?",
                content: <Text>No. The application route directs visitors to verified school contact channels.</Text>,
              },
              {
                title: "Are cookies or analytics covered by this interim notice?",
                content: (
                  <Text>
                    Not yet. Any approved analytics, consent controls and service-provider details must be documented before launch.
                  </Text>
                ),
              },
              {
                title: "Where can I ask a privacy question?",
                content: <Text>Email the school at {siteFacts.email}.</Text>,
              },
            ]}
          />
        </ReadingContainer>
      </Section>
    );
  }

  return null;
}

function RoutePage({ path, spec }: { path: string; spec: PageSpec }) {
  const childLinks = childLinksFor(path);

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="route-page">
        <Section className="route-hero" tone="raised">
          <ReadingContainer>
            <Stack gap="24">
              <Eyebrow>{spec.eyebrow}</Eyebrow>
              <Heading as="h1" level="page">
                {spec.title}
              </Heading>
              <Lead>{spec.summary}</Lead>
              {spec.notice ? (
                <Alert title="Content status" kind="warning">
                  {spec.notice}
                </Alert>
              ) : null}
              <PageActions />
            </Stack>
          </ReadingContainer>
        </Section>

        {childLinks.length > 0 ? (
          <Section aria-labelledby="section-links-title">
            <PageContainer>
              <Stack gap="32">
                <div>
                  <Eyebrow>Explore this section</Eyebrow>
                  <Heading as="h2" level="section" id="section-links-title">
                    Find the information you need
                  </Heading>
                </div>
                <Grid min="card">
                  {childLinks.map((child) => (
                    <ProgrammeCard
                      key={child.href}
                      eyebrow={spec.title}
                      title={child.label}
                      description={child.description}
                      href={child.href}
                    />
                  ))}
                </Grid>
              </Stack>
            </PageContainer>
          </Section>
        ) : null}

        <Section aria-labelledby="page-information-title">
          <ReadingContainer>
            <Stack gap="48">
              {spec.sections.map((section, index) => (
                <Stack gap="16" key={section.title}>
                  <Heading
                    as="h2"
                    level="section"
                    id={index === 0 ? "page-information-title" : undefined}
                  >
                    {section.title}
                  </Heading>
                  {section.paragraphs.map((paragraph) => (
                    <Text key={paragraph}>{paragraph}</Text>
                  ))}
                  {section.bullets ? (
                    <List>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </List>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </ReadingContainer>
        </Section>

        <SpecialContent path={path} />

        <Section className="route-page__closing" tone="brand" aria-labelledby="route-help-title">
          <ReadingContainer>
            <Stack gap="16">
              <Heading as="h2" level="section" id="route-help-title">
                Need an answer before this page is complete?
              </Heading>
              <Text>
                Contact the school for current, approved information. The Phase 1 website deliberately avoids filling evidence gaps with assumptions.
              </Text>
              <PageActions />
            </Stack>
          </ReadingContainer>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

export function generateStaticParams() {
  return [...new Set([...allKnownPaths, ...legacyCatchAllRedirects.keys()])]
    .map((path) => ({ slug: path.slice(1).split("/") }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (isProgrammesPublicationRoute(path)) return { title: "Page not found", robots: { index: false, follow: false } };
  const spec = pageSpecs[path];

  if (!spec) {
    return { title: "Page not found" };
  }

  return {
    title: spec.title,
    description: spec.summary,
  };
}

export default async function CatchAllPage({ params }: RouteProps) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (isProgrammesPublicationRoute(path)) notFound();
  const legacyTarget = legacyCatchAllRedirectTarget(path);
  if (legacyTarget) permanentRedirect(legacyTarget);
  const spec = pageSpecs[path];

  if (!spec || !allKnownPaths.has(path)) {
    notFound();
  }

  return <RoutePage path={path} spec={spec} />;
}
