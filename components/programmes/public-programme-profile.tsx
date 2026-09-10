import Link from "next/link";

import type { PublicProgrammeProfile } from "@/app/data/programmes-public-profiles";
import {
  isPublicProgrammeProfileCurrent,
  publicProgrammeProfiles,
} from "@/app/data/programmes-public-profiles";
import { Alert } from "@/components/content";
import { PageContainer, Section, Stack } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Eyebrow, Heading, Lead, Text } from "@/components/typography";

export function PublicProgrammeProfilePage({
  profile,
  privatePreview = false,
}: {
  profile: PublicProgrammeProfile;
  privatePreview?: boolean;
}) {
  const relatedProfiles = publicProgrammeProfiles.filter(
    (candidate) => candidate.route !== profile.route && isPublicProgrammeProfileCurrent(candidate),
  );

  return (
    <>
      <SiteHeader />
      <main
        className="programme-public-profile"
        data-programme-profile={profile.id}
        data-publication-state="approved-public-subset"
        id="main-content"
        tabIndex={-1}
      >
        <Section className="programme-hero programme-public-profile__hero" tone="brand" aria-labelledby="programme-profile-title">
          <PageContainer className="programme-hero__layout">
            <Stack className="programme-hero__copy" gap="24">
              <Eyebrow>{profile.eyebrow}</Eyebrow>
              <Heading as="h1" level="display" id="programme-profile-title">{profile.title}</Heading>
              <Lead>{profile.summary}</Lead>
              <p className="programme-public-profile__identity">{profile.displayName}</p>
              <div className="programme-public-profile__actions">
                <Link className="button button--primary" href="/admissions/apply">Apply for Admission</Link>
                <Link className="button button--secondary" href="/admissions/enquire">Enquire Now</Link>
              </div>
            </Stack>
          </PageContainer>
        </Section>

        <Section className="programme-section" tone="page" aria-labelledby="programme-profile-facts-title">
          <PageContainer>
            {privatePreview ? (
              <Alert title="Private deployment preview" kind="information">
                <p>This is the same approved public subset prepared for release; private review data is not displayed here.</p>
              </Alert>
            ) : null}
            <div className="programme-section-heading">
              <div>
                <Eyebrow>Approved public facts</Eyebrow>
                <Heading as="h2" level="section" id="programme-profile-facts-title">What is confirmed now.</Heading>
              </div>
              <Text>{profile.publicationNote}</Text>
            </div>
            <dl className="programme-fact-grid">
              {profile.facts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          </PageContainer>
        </Section>

        {profile.groups.map((group, groupIndex) => {
          const titleId = `programme-profile-group-${groupIndex + 1}`;
          return (
            <Section className="programme-section" tone="subtle" aria-labelledby={titleId} key={group.title}>
              <PageContainer>
                <div className="programme-section-heading">
                  <div>
                    <Eyebrow>Published programme information</Eyebrow>
                    <Heading as="h2" level="section" id={titleId}>{group.title}</Heading>
                  </div>
                  <Text>{group.description}</Text>
                </div>
                <div className="programme-card-grid">
                  {group.items.map((item) => (
                    <article className="programme-list-card" key={item}>
                      <Heading as="h3" level="subsection">{item}</Heading>
                    </article>
                  ))}
                </div>
              </PageContainer>
            </Section>
          );
        })}

        <Section className="programme-section programme-public-profile__scope" tone="page" aria-labelledby="programme-profile-scope-title">
          <PageContainer>
            <Alert title="Information still withheld" kind="information">
              <p id="programme-profile-scope-title">
                The following information is not published on this page yet: {profile.withheldSections.join(", ")}.
              </p>
            </Alert>
          </PageContainer>
        </Section>

        <Section className="programme-section" tone="subtle" aria-labelledby="programme-profile-related-title">
          <PageContainer>
            <div className="programme-section-heading">
              <div>
                <Eyebrow>Institutional pathways</Eyebrow>
                <Heading as="h2" level="section" id="programme-profile-related-title">Explore each section separately.</Heading>
              </div>
              <Text>The CBSE school, Maharashtra Junior College and Institute are presented as distinct public sections.</Text>
            </div>
            <nav className="programme-public-profile__related" aria-label="Related programme profiles">
              {relatedProfiles.map((candidate) => (
                <Link href={candidate.route} key={candidate.route}>
                  <span>{candidate.eyebrow}</span>
                  <strong>{candidate.navigationLabel}</strong>
                </Link>
              ))}
            </nav>
          </PageContainer>
        </Section>

        <Section className="programme-admissions-cta programme-public-profile__closing" tone="brand" aria-labelledby="programme-profile-cta-title">
          <PageContainer className="programme-admissions-cta__layout">
            <div>
              <Eyebrow>Admissions</Eyebrow>
              <Heading as="h2" level="section" id="programme-profile-cta-title">Ask for the current admission details.</Heading>
              <Lead>Eligibility, availability, dates and fees are confirmed through the admissions team before an application is submitted.</Lead>
            </div>
            <div className="programme-admissions-cta__actions">
              <Link className="button button--primary" href="/admissions/apply">Apply for Admission</Link>
              <Link className="button button--secondary" href="/admissions/enquire">Enquire Now</Link>
            </div>
          </PageContainer>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
