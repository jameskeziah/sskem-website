import {
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "../../lib/programmes-publication-routes.ts";
import type { ProgrammePrototypeImage } from "../../lib/programmes-media.ts";

export const PROGRAMME_SHELL_COMPONENTS = [
  "Programme hero",
  "Subjects and streams",
  "Eligibility",
  "Schedule",
  "Fee summary",
  "Faculty profiles",
  "Facilities",
  "Results",
  "Documents",
  "Admissions CTA",
] as const;

export type ProgrammeShellComponent = (typeof PROGRAMME_SHELL_COMPONENTS)[number];

type ProgrammeShellSlot = Readonly<{
  component: ProgrammeShellComponent;
  requirement: string;
  status: "required" | "conditional";
}>;

export type PrivateProgrammeRouteShellSpec = Readonly<{
  route: ProgrammesPublicationRoute;
  eyebrow: string;
  title: string;
  summary: string;
  reviewQuestion: string;
  blockers: readonly string[];
  slots: readonly ProgrammeShellSlot[];
  media: ProgrammePrototypeImage;
}>;

const sharedSlots = {
  hero: {
    component: "Programme hero",
    status: "required",
    requirement: "Approved programme identity, public summary and independently approved hero media.",
  },
  subjects: {
    component: "Subjects and streams",
    status: "required",
    requirement: "Current levels, streams and subjects mapped from canonical programme records.",
  },
  eligibility: {
    component: "Eligibility",
    status: "required",
    requirement: "Current academic-year eligibility and admissions evidence.",
  },
  schedule: {
    component: "Schedule",
    status: "required",
    requirement: "Current academic-year schedule with a verified timetable evidence ID.",
  },
  fees: {
    component: "Fee summary",
    status: "required",
    requirement: "Approved public wording from the current fee circular; no unverified amount.",
  },
  faculty: {
    component: "Faculty profiles",
    status: "required",
    requirement: "Current public-role profiles with qualification evidence and consent; no contact details.",
  },
  facilities: {
    component: "Facilities",
    status: "required",
    requirement: "Current campus availability, verified facility descriptions and approved media references.",
  },
  results: {
    component: "Results",
    status: "conditional",
    requirement: "An explicit no-results decision or verified aggregate results; never pupil-level records.",
  },
  documents: {
    component: "Documents",
    status: "required",
    requirement: "Route-approved brochure, timetable/calendar, fee circular and affiliation records resolved from exact guarded PDF bindings; controlled evidence stays private.",
  },
  admissions: {
    component: "Admissions CTA",
    status: "required",
    requirement: "Approved label, destination and current public contact route from the same package version.",
  },
} as const satisfies Record<string, ProgrammeShellSlot>;

function slots(overrides: Partial<Record<ProgrammeShellComponent, Partial<ProgrammeShellSlot>>> = {}) {
  return Object.values(sharedSlots).map((slot) => ({ ...slot, ...overrides[slot.component] }));
}

export const privateProgrammeRouteShells: Record<ProgrammesPublicationRoute, PrivateProgrammeRouteShellSpec> = {
  "/school/academics": {
    route: "/school/academics",
    eyebrow: "School route review",
    title: "School academics",
    summary: "A private structural shell for reviewing how approved school-level academic records will become a clear parent-facing page.",
    reviewQuestion: "Does this order make curriculum, subject choice, learning support and admissions easy to understand without introducing unapproved facts?",
    blockers: [
      "Approved school levels, curriculum, subjects and assessment wording are not bound.",
      "Current faculty, facilities, schedule, documents and admissions CTA records are not bound.",
      "No digest-covered public projection has been accepted for this route.",
    ],
    slots: slots({
      "Fee summary": { status: "conditional", requirement: "Approved current fee wording or an explicit decision to link only to the governed admissions fee page." },
      Results: { status: "conditional", requirement: "Publish only if management selects verified aggregate academic outcomes for this route." },
    }),
    media: {
      scope: "private-prototype",
      kind: "image",
      id: "school-academics-hero-prototype",
      sourceRecordId: "media-campus-main",
      src: "/media/home/campus-main.jpeg",
      width: 1400,
      height: 500,
      aspectRatio: "panoramic",
      fit: "cover",
      alt: "SSKEMS campus exterior shown only as a private route-shell reference.",
      sizes: "(max-width: 63.999rem) 100vw, 42vw",
      loading: "eager",
      caption: "Campus exterior composition reference",
      captionDetail: "Private prototype only; independent media approval remains required.",
    },
  },
  "/junior-college": {
    route: "/junior-college",
    eyebrow: "Institutional route review",
    title: "Junior College",
    summary: "A private structural shell awaiting confirmation of institutional status, board, recognition, classes, streams and current admissions information.",
    reviewQuestion: "Can a family identify the exact institution, board, XI-XII pathway, streams, eligibility, costs and schedule from approved records alone?",
    blockers: [
      "XI-XII status, board and recognised-institution wording are not represented by approved canonical fields.",
      "Affiliation, current streams, fees, schedule and campus availability are not bound.",
      "No digest-covered public projection has been accepted for this route.",
    ],
    slots: slots({
      "Subjects and streams": { requirement: "Confirmed XI-XII levels, board, streams and subjects with recognition or affiliation evidence." },
      Results: { status: "conditional", requirement: "An explicit no-results decision or verified aggregate Junior College outcomes." },
    }),
    media: {
      scope: "private-prototype",
      kind: "image",
      id: "junior-college-hero-prototype",
      sourceRecordId: "media-campus-grounds",
      src: "/media/home/campus-grounds.jpeg",
      width: 1400,
      height: 500,
      aspectRatio: "panoramic",
      fit: "cover",
      alt: "SSKEMS campus grounds shown only as a private route-shell reference.",
      sizes: "(max-width: 63.999rem) 100vw, 42vw",
      loading: "eager",
      caption: "Campus grounds composition reference",
      captionDetail: "Private prototype only; no campus-to-programme claim is implied.",
    },
  },
  "/programmes/jee-neet": {
    route: "/programmes/jee-neet",
    eyebrow: "Competitive-exam route review",
    title: "JEE and NEET preparation",
    summary: "A private structural shell awaiting approved operator, relationship, delivery, subject, faculty, fee, schedule and aggregate-result records.",
    reviewQuestion: "Does the future page clearly distinguish the operator, institutional relationship, delivery model and verified outcomes without using unsupported programme language?",
    blockers: [
      "The operator and SSKEMS-ProTrack relationship are not bound as approved canonical records.",
      "Use of integrated terminology, delivery model, exams, classes, faculty, fees and schedule is not approved.",
      "No digest-covered public projection has been accepted for this route.",
    ],
    slots: slots({
      "Programme hero": { requirement: "Approved operator-aware identity, public summary and hero media without unsupported integrated wording." },
      "Subjects and streams": { requirement: "Confirmed examinations, student groups and subjects from the approved delivery model." },
      Results: { status: "required", requirement: "Verified aggregate results or an explicit no-results publication decision; no named pupil data." },
    }),
    media: {
      scope: "private-prototype",
      kind: "image",
      id: "jee-neet-hero-prototype",
      sourceRecordId: "media-campus-entrance",
      src: "/media/home/campus-entrance.jpeg",
      width: 1400,
      height: 500,
      aspectRatio: "panoramic",
      fit: "cover",
      alt: "SSKEMS campus entrance shown only as a private route-shell reference.",
      sizes: "(max-width: 63.999rem) 100vw, 42vw",
      loading: "eager",
      caption: "Campus entrance composition reference",
      captionDetail: "Private prototype only; no JEE/NEET operator claim is implied.",
    },
  },
};

if (Object.keys(privateProgrammeRouteShells).length !== PROGRAMMES_PUBLICATION_ROUTES.length) {
  throw new Error("Every governed Programme route requires one private route shell.");
}
