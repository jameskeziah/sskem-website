import type { ProgrammesWorkbookPrivateDraft } from "./programmes-workbook-intake.ts";

export const programmeRehearsalSectionIds = [
  "hero",
  "subjects-streams",
  "eligibility",
  "schedule",
  "fees",
  "faculty",
  "facilities",
  "results",
  "documents",
  "admissions-cta",
] as const;

export type ProgrammeRehearsalSectionId = (typeof programmeRehearsalSectionIds)[number];

export type ProgrammeRehearsalSection = Readonly<{
  id: ProgrammeRehearsalSectionId;
  number: string;
  title: string;
  state: "screened-facts-present" | "locked";
  publicationState: "blocked";
  facts: ReadonlyArray<Readonly<{ label: string; value: string }>>;
  missing: readonly string[];
}>;

export type ProgrammePageRehearsal = Readonly<{
  recordId: ProgrammesWorkbookPrivateDraft["recordId"];
  title: ProgrammesWorkbookPrivateDraft["title"];
  state: "temporary-private-rehearsal";
  publicationAuthorized: false;
  publicationReadySectionCount: 0;
  coveredSectionCount: number;
  totalSectionCount: 10;
  sections: readonly ProgrammeRehearsalSection[];
}>;

function present(label: string, value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? { label, value: normalized } : null;
}

function section(
  id: ProgrammeRehearsalSectionId,
  title: string,
  facts: Array<Readonly<{ label: string; value: string }> | null>,
  missing: string[],
): ProgrammeRehearsalSection {
  const screenedFacts = facts.filter((fact): fact is Readonly<{ label: string; value: string }> => fact !== null);
  return {
    id,
    number: String(programmeRehearsalSectionIds.indexOf(id) + 1).padStart(2, "0"),
    title,
    state: screenedFacts.length ? "screened-facts-present" : "locked",
    publicationState: "blocked",
    facts: screenedFacts,
    missing,
  };
}

export function createProgrammePageRehearsal(
  draft: ProgrammesWorkbookPrivateDraft,
): ProgrammePageRehearsal {
  if (!draft || draft.state !== "provisional-private-draft" || draft.publicationAuthorized !== false) {
    throw new Error("Programme page rehearsal requires a non-authorizing provisional workbook draft.");
  }
  const { facts } = draft;
  const sections: ProgrammeRehearsalSection[] = [
    section("hero", "Programme hero", [
      present("Academic year", facts.academicYear),
      present("Student levels", facts.studentLevels),
      present("Duration", facts.duration),
      present("Intended audience", facts.intendedAudience),
    ], ["approved public summary", "approved hero media", "publication decision"]),
    section("subjects-streams", "Subjects and streams", [
      present("Student levels", facts.studentLevels),
      facts.subjects.length ? { label: "Subjects", value: facts.subjects.join(" · ") } : null,
    ], [
      ...(facts.studentLevels ? [] : ["student levels"]),
      "approved streams",
      ...(facts.subjects.length ? [] : ["approved subjects"]),
    ]),
    section("eligibility", "Eligibility", [
      present("Screened outline", facts.eligibility),
      present("Entry point", facts.entryPoint),
      present("Intended audience", facts.intendedAudience),
    ], [
      ...(facts.eligibility ? [] : ["eligibility rules"]),
      "evidence-backed final wording",
    ]),
    section("schedule", "Schedule", [
      present("Academic year", facts.academicYear),
      present("Duration", facts.duration),
      present("Entry point", facts.entryPoint),
      present("Delivery mode", facts.deliveryMode),
      present("Medium", facts.medium),
    ], ["approved timetable", "current admission dates", "campus availability"]),
    section("fees", "Fee summary", [], ["approved public fee wording", "current fee circular", "validity period"]),
    section("faculty", "Faculty profiles", [], ["approved public profiles", "role and qualification wording", "consent references"]),
    section("facilities", "Facilities", [], ["approved facilities wording", "campus mapping", "approved media"]),
    section("results", "Results", [], ["verified aggregate results", "result-proof evidence", "claim approval"]),
    section("documents", "Documents", [], ["approved brochure", "approved timetable", "fee and affiliation documents"]),
    section("admissions-cta", "Admissions CTA", [], ["approved CTA wording", "safe destination", "current admissions window"]),
  ];
  return {
    recordId: draft.recordId,
    title: draft.title,
    state: "temporary-private-rehearsal",
    publicationAuthorized: false,
    publicationReadySectionCount: 0,
    coveredSectionCount: sections.filter((candidate) => candidate.facts.length > 0).length,
    totalSectionCount: 10,
    sections,
  };
}
