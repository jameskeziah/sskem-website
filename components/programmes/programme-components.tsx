import type { ReactNode } from "react";

import { PageContainer, Section, Stack } from "@/components/layout";
import {
  ProgrammeAffiliationDocuments,
  ProgrammeBrochures,
  ProgrammeFeeCirculars,
  ProgrammeTimetables,
} from "@/components/programmes/programme-document-groups";
import { Eyebrow, Heading, Lead, Text } from "@/components/typography";
import {
  isPipelineApprovedProgrammeDocument,
  type ApprovedProgrammeDocument,
} from "@/lib/programmes-document-integration";
import {
  isApprovedProgrammeRenderGate,
  type ApprovedProgrammeRenderGate,
} from "@/lib/programmes-render-gate";

type ApprovalBoundProps = {
  gate: ApprovedProgrammeRenderGate;
};

type LabelValue = Readonly<{
  label: string;
  value: string;
}>;

function sectionId(gate: ApprovedProgrammeRenderGate, suffix: string) {
  return `${gate.route.replace(/^\//, "").replaceAll("/", "-")}-${suffix}`;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function hasSafePublicHref(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.includes("\\") && !value.split("/").includes("..");
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function ProgrammePublicationBoundary({
  gate,
  children,
  className = "",
  tone = "page",
  labelledBy,
}: ApprovalBoundProps & {
  children: ReactNode;
  className?: string;
  tone?: "page" | "subtle" | "raised" | "brand";
  labelledBy: string;
}) {
  if (!isApprovedProgrammeRenderGate(gate)) return null;

  return (
    <Section
      aria-labelledby={labelledBy}
      className={`programme-section ${className}`.trim()}
      data-programme-route={gate.route}
      tone={tone}
    >
      {children}
    </Section>
  );
}

function ProgrammeSectionHeading({
  eyebrow,
  title,
  summary,
  id,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  id: string;
}) {
  return (
    <header className="programme-section-heading">
      <Stack gap="12">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading id={id} level="section">{title}</Heading>
      </Stack>
      {summary ? <Text>{summary}</Text> : null}
    </header>
  );
}

export function ProgrammeHero({
  gate,
  eyebrow,
  title,
  summary,
  approvedMedia,
}: ApprovalBoundProps & {
  eyebrow: string;
  title: string;
  summary: string;
  approvedMedia?: ReactNode;
}) {
  if (![eyebrow, title, summary].every(hasText)) return null;
  const titleId = sectionId(gate, "title");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-hero" tone="brand">
      <PageContainer className={`programme-hero__layout${approvedMedia ? " programme-hero__layout--with-media" : ""}`}>
        <Stack className="programme-hero__copy" gap="24">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading as="h1" id={titleId} level="display">{title}</Heading>
          <Lead>{summary}</Lead>
        </Stack>
        {approvedMedia ? <div className="programme-hero__media">{approvedMedia}</div> : null}
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export function ProgrammeSubjectsStreams({
  gate,
  levels = [],
  streams = [],
  subjects = [],
  summary,
}: ApprovalBoundProps & {
  levels?: readonly string[];
  streams?: readonly string[];
  subjects?: readonly string[];
  summary?: string;
}) {
  const groups = [
    { title: "Classes and levels", items: levels.filter(hasText) },
    { title: "Streams", items: streams.filter(hasText) },
    { title: "Subjects", items: subjects.filter(hasText) },
  ].filter((group) => group.items.length > 0);
  if (!groups.length) return null;
  const titleId = sectionId(gate, "subjects-streams");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-subjects" tone="subtle">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow="Academic pathway" title="Subjects and streams" summary={summary} id={titleId} />
        <div className="programme-card-grid">
          {groups.map((group) => (
            <article className="programme-list-card" key={group.title}>
              <Heading as="h3" level="subsection">{group.title}</Heading>
              <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export function ProgrammeEligibility({
  gate,
  summary,
  requirements = [],
}: ApprovalBoundProps & {
  summary: string;
  requirements?: readonly string[];
}) {
  if (!hasText(summary)) return null;
  const titleId = sectionId(gate, "eligibility");
  const safeRequirements = requirements.filter(hasText);

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-eligibility">
      <PageContainer className="programme-split">
        <ProgrammeSectionHeading eyebrow="Entry requirements" title="Eligibility" id={titleId} />
        <div className="programme-panel">
          <Lead>{summary}</Lead>
          {safeRequirements.length ? <ul>{safeRequirements.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export function ProgrammeSchedule({
  gate,
  summary,
  entries = [],
}: ApprovalBoundProps & {
  summary: string;
  entries?: readonly LabelValue[];
}) {
  if (!hasText(summary)) return null;
  const titleId = sectionId(gate, "schedule");
  const safeEntries = entries.filter((entry) => hasText(entry.label) && hasText(entry.value));

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-schedule" tone="subtle">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow="Current academic year" title="Schedule" summary={summary} id={titleId} />
        {safeEntries.length ? (
          <dl className="programme-fact-grid">
            {safeEntries.map((entry) => <div key={`${entry.label}-${entry.value}`}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}
          </dl>
        ) : null}
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export type ProgrammeFee = Readonly<{
  id: string;
  category: string;
  approvedPublicWording: string;
  amount?: string | null;
}>;

export function ProgrammeFeeSummary({
  gate,
  academicYear,
  summary,
  fees,
}: ApprovalBoundProps & {
  academicYear: string;
  summary?: string;
  fees: readonly ProgrammeFee[];
}) {
  const safeFees = fees.filter((fee) => hasText(fee.id) && hasText(fee.category) && hasText(fee.approvedPublicWording));
  if (!safeFees.length || !hasText(academicYear)) return null;
  const titleId = sectionId(gate, "fees");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-fees">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow={academicYear} title="Fee summary" summary={summary} id={titleId} />
        <dl className="programme-fee-list">
          {safeFees.map((fee) => (
            <div key={fee.id}>
              <dt>{fee.category}</dt>
              <dd><span>{fee.approvedPublicWording}</span>{fee.amount ? <strong>{fee.amount}</strong> : null}</dd>
            </div>
          ))}
        </dl>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export type ProgrammeFacultyProfile = Readonly<{
  id: string;
  publicDisplayName: string;
  publicRole: string;
  publicQualificationSummary: string;
  subjectsOrFunctions: readonly string[];
}>;

export function ProgrammeFacultyProfiles({
  gate,
  profiles,
}: ApprovalBoundProps & {
  profiles: readonly ProgrammeFacultyProfile[];
}) {
  const safeProfiles = profiles.filter((profile) => [profile.id, profile.publicDisplayName, profile.publicRole, profile.publicQualificationSummary].every(hasText));
  if (!safeProfiles.length) return null;
  const titleId = sectionId(gate, "faculty");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-faculty" tone="subtle">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow="Approved public profiles" title="Faculty" id={titleId} />
        <div className="programme-card-grid programme-card-grid--people">
          {safeProfiles.map((profile) => (
            <article className="programme-person-card" key={profile.id}>
              <span className="programme-person-card__mark" aria-hidden="true">{profile.publicDisplayName.trim().charAt(0)}</span>
              <Heading as="h3" level="subsection">{profile.publicDisplayName}</Heading>
              <Text className="programme-person-card__role">{profile.publicRole}</Text>
              <Text>{profile.publicQualificationSummary}</Text>
              {profile.subjectsOrFunctions.length ? <ul>{profile.subjectsOrFunctions.filter(hasText).map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </article>
          ))}
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export type ProgrammeFacility = Readonly<{
  id: string;
  publicName: string;
  publicSummary: string;
}>;

export function ProgrammeFacilities({ gate, facilities }: ApprovalBoundProps & { facilities: readonly ProgrammeFacility[] }) {
  const safeFacilities = facilities.filter((facility) => [facility.id, facility.publicName, facility.publicSummary].every(hasText));
  if (!safeFacilities.length) return null;
  const titleId = sectionId(gate, "facilities");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-facilities">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow="Learning environment" title="Facilities" id={titleId} />
        <div className="programme-card-grid">
          {safeFacilities.map((facility, index) => (
            <article className="programme-facility-card" key={facility.id}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <Heading as="h3" level="subsection">{facility.publicName}</Heading>
              <Text>{facility.publicSummary}</Text>
            </article>
          ))}
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export type ProgrammeAggregateResult = Readonly<{
  id: string;
  exam: string;
  year: number;
  cohortDefinition: string;
  aggregateMetric: string;
  aggregateValue: string;
}>;

export function ProgrammeResults({ gate, results }: ApprovalBoundProps & { results: readonly ProgrammeAggregateResult[] }) {
  const safeResults = results.filter((result) => [result.id, result.exam, result.cohortDefinition, result.aggregateMetric, result.aggregateValue].every(hasText) && Number.isInteger(result.year));
  if (!safeResults.length) return null;
  const titleId = sectionId(gate, "results");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-results" tone="subtle">
      <PageContainer>
        <ProgrammeSectionHeading eyebrow="Verified aggregates only" title="Results" summary="Only approved cohort-level outcomes are presented here." id={titleId} />
        <div className="programme-table-scroll" tabIndex={0} role="region" aria-label="Verified aggregate results, scrollable table">
          <table>
            <caption className="visually-hidden">Verified aggregate programme results</caption>
            <thead><tr><th scope="col">Exam</th><th scope="col">Year</th><th scope="col">Cohort</th><th scope="col">Metric</th><th scope="col">Aggregate result</th></tr></thead>
            <tbody>{safeResults.map((result) => <tr key={result.id}><th scope="row">{result.exam}</th><td>{result.year}</td><td>{result.cohortDefinition}</td><td>{result.aggregateMetric}</td><td><strong>{result.aggregateValue}</strong></td></tr>)}</tbody>
          </table>
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

export function ProgrammeDocuments({ gate, documents }: ApprovalBoundProps & { documents: readonly ApprovedProgrammeDocument[] }) {
  if (!documents.length || documents.some((document) => !isPipelineApprovedProgrammeDocument(document))) return null;
  const titleId = sectionId(gate, "documents");
  const byKind = (kind: ApprovedProgrammeDocument["kind"]) => documents.filter((document) => document.kind === kind);

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-documents">
      <PageContainer>
        <ProgrammeSectionHeading
          eyebrow="Guarded public files"
          title="Programme documents"
          summary="Only current files resolved through the exact approved-document registry appear here."
          id={titleId}
        />
        <div className="programme-document-groups">
          <ProgrammeBrochures gate={gate} documents={byKind("brochure")} />
          <ProgrammeTimetables gate={gate} documents={byKind("timetable")} />
          <ProgrammeFeeCirculars gate={gate} documents={byKind("fee-circular")} />
          <ProgrammeAffiliationDocuments gate={gate} documents={byKind("affiliation-document")} />
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}

type ProgrammeAction = Readonly<{
  label: string;
  href: string;
}>;

export function ProgrammeAdmissionsCta({
  gate,
  title,
  summary,
  primaryAction,
  secondaryAction,
}: ApprovalBoundProps & {
  title: string;
  summary: string;
  primaryAction: ProgrammeAction;
  secondaryAction?: ProgrammeAction;
}) {
  if (
    ![title, summary, primaryAction.label].every(hasText)
    || !hasSafePublicHref(primaryAction.href)
    || (secondaryAction && (!hasText(secondaryAction.label) || !hasSafePublicHref(secondaryAction.href)))
  ) return null;
  const titleId = sectionId(gate, "admissions");

  return (
    <ProgrammePublicationBoundary gate={gate} labelledBy={titleId} className="programme-admissions-cta" tone="brand">
      <PageContainer className="programme-admissions-cta__layout">
        <Stack gap="16">
          <Eyebrow>Admissions</Eyebrow>
          <Heading id={titleId} level="section">{title}</Heading>
          <Lead>{summary}</Lead>
        </Stack>
        <div className="programme-admissions-cta__actions">
          <a className="button button--primary" href={primaryAction.href}>{primaryAction.label}</a>
          {secondaryAction ? <a className="button button--secondary" href={secondaryAction.href}>{secondaryAction.label}</a> : null}
        </div>
      </PageContainer>
    </ProgrammePublicationBoundary>
  );
}
