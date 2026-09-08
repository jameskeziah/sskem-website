import { PageContainer, Section, Stack } from "@/components/layout";
import {
  ProgrammeAdmissionsCta,
  ProgrammeFeeSummary,
  ProgrammeResults,
  ProgrammeSchedule,
} from "@/components/programmes/programme-components";
import { Eyebrow, Heading, Text } from "@/components/typography";
import {
  isIssuedProgrammeExpiryProjection,
  type ProgrammeExpiryFallback,
  type ProgrammeExpiryProjection,
  type ProgrammeTimeSensitiveSection,
} from "@/lib/programmes-expiry";
import type { ApprovedProgrammeRenderGate } from "@/lib/programmes-render-gate";

type ExpiryBoundProps = Readonly<{
  gate: ApprovedProgrammeRenderGate;
  projection: ProgrammeExpiryProjection;
}>;

function fallbackId(gate: ApprovedProgrammeRenderGate, section: ProgrammeTimeSensitiveSection) {
  return `${gate.route.replace(/^\//, "").replaceAll("/", "-")}-${section}-fallback`;
}

function ProgrammeExpiryFallbackNotice({
  gate,
  section,
  fallback,
}: Readonly<{
  gate: ApprovedProgrammeRenderGate;
  section: ProgrammeTimeSensitiveSection;
  fallback: ProgrammeExpiryFallback;
}>) {
  const titleId = fallbackId(gate, section);

  return (
    <Section
      aria-labelledby={titleId}
      className="programme-expiry-fallback"
      data-programme-expiry-section={section}
      data-programme-expiry-state="fallback"
      tone="subtle"
    >
      <PageContainer>
        <div className="programme-expiry-fallback__panel">
          <Stack gap="12">
            <Eyebrow>Current information</Eyebrow>
            <Heading as="h2" id={titleId} level="subsection">{fallback.title}</Heading>
            <Text>{fallback.message}</Text>
          </Stack>
          <a className="button button--secondary" href={fallback.action.href}>{fallback.action.label}</a>
        </div>
      </PageContainer>
    </Section>
  );
}

export function ProgrammeExpiringFeeSummary({ gate, projection }: ExpiryBoundProps) {
  if (!isIssuedProgrammeExpiryProjection(projection, gate)) return null;
  const decision = projection.sections.fees;
  if (decision.state === "not-applicable") return null;
  if (decision.state === "fallback") {
    return <ProgrammeExpiryFallbackNotice gate={gate} section="fees" fallback={decision.fallback} />;
  }
  return <ProgrammeFeeSummary gate={gate} {...decision.content} />;
}

export function ProgrammeExpiringSchedule({ gate, projection }: ExpiryBoundProps) {
  if (!isIssuedProgrammeExpiryProjection(projection, gate)) return null;
  const decision = projection.sections.schedule;
  if (decision.state === "not-applicable") return null;
  if (decision.state === "fallback") {
    return <ProgrammeExpiryFallbackNotice gate={gate} section="schedule" fallback={decision.fallback} />;
  }
  return <ProgrammeSchedule gate={gate} {...decision.content} />;
}

export function ProgrammeExpiringResults({ gate, projection }: ExpiryBoundProps) {
  if (!isIssuedProgrammeExpiryProjection(projection, gate)) return null;
  const decision = projection.sections.results;
  if (decision.state === "not-applicable") return null;
  if (decision.state === "fallback") {
    return <ProgrammeExpiryFallbackNotice gate={gate} section="results" fallback={decision.fallback} />;
  }
  return <ProgrammeResults gate={gate} results={decision.content.results} />;
}

export function ProgrammeExpiringAdmissionsCta({ gate, projection }: ExpiryBoundProps) {
  if (!isIssuedProgrammeExpiryProjection(projection, gate)) return null;
  const decision = projection.sections.admissions;
  if (decision.state === "not-applicable") return null;
  if (decision.state === "fallback") {
    return <ProgrammeExpiryFallbackNotice gate={gate} section="admissions" fallback={decision.fallback} />;
  }
  return <ProgrammeAdmissionsCta gate={gate} {...decision.content} />;
}
