import manifestData from "../content/approval-manifest.json" with { type: "json" };
import pipelineData from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  campusMediaPublicationRegistry,
  campusMediaPublicationRoles,
  campusMediaPublicationSummary,
  createCampusMediaPublicationIndex,
  type CampusMediaApprovalManifestInput,
  type CampusMediaPublicationRegistryInput,
  type CampusRecordId,
} from "./campus-media-publication.ts";

type ManifestRecord = {
  id: string;
  kind: string;
  title: string;
  publicTargets: string[];
  checkProfile: string;
  checks: Record<string, string>;
  decision: string;
  evidenceReferences: string[];
  expiresAt: string | null;
};
type CaptureManifest = CampusMediaApprovalManifestInput & {
  manifestId: string;
  updatedOn: string;
  checkProfiles: Record<string, string[]>;
  records: ManifestRecord[];
};
type PipelineConfig = {
  schemaVersion: number;
  pipelineId: string;
  allowedInputFormats: string[];
  allowedColourSpaces: string[];
  minimumMaster: { longEdge: number; shortEdge: number };
  profiles: Record<string, {
    description: string;
    widths: number[];
    formats: Record<string, { maximumBytes: number }>;
  }>;
};

const captureDirectionByRecordId: Record<CampusRecordId, {
  captureOrder: number;
  homepageUse: string;
  direction: string;
  avoid: string[];
}> = {
  "media-campus-main": {
    captureOrder: 1,
    homepageUse: "Hero and social-poster source",
    direction: "Wide, unobstructed main exterior with the complete pink-and-white building readable in one landscape frame.",
    avoid: ["Digital enlargement", "cropping the building", "identifiable people without separate review"],
  },
  "media-campus-grounds": {
    captureOrder: 2,
    homepageUse: "Campus chapter establishing view",
    direction: "Show the full building across the open grounds with a level horizon and uncluttered sight lines.",
    avoid: ["Staged pupils", "cutting off the grounds context", "heavy filters"],
  },
  "media-campus-entrance": {
    captureOrder: 3,
    homepageUse: "Campus chapter arrival detail",
    direction: "Photograph the front approach with the school sign readable and power lines minimized through camera position.",
    avoid: ["Unreadable signage", "visible personal details", "perspective distortion"],
  },
  "media-campus-courtyard": {
    captureOrder: 4,
    homepageUse: "Campus chapter shaded perspective",
    direction: "Capture a truthful shaded campus perspective with balanced exposure and the surrounding grounds retained.",
    avoid: ["Crushed shadows", "invented or removed campus features", "staged pupils"],
  },
};

function isoDateTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Campus media capture packet requires a valid generation time.");
  return date.toISOString();
}

function assertPacketSources(manifest: CaptureManifest, pipeline: PipelineConfig) {
  if (manifest.manifestId !== "sskem-publication-approvals" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.updatedOn)) {
    throw new Error("Campus media capture packet requires the canonical approval manifest.");
  }
  if (pipeline.schemaVersion !== 1 || pipeline.pipelineId !== "sskem-campus-media") {
    throw new Error("Campus media capture packet requires the canonical media pipeline.");
  }
  const profileChecks = manifest.checkProfiles["campus-media"];
  if (!Array.isArray(profileChecks) || !profileChecks.length) throw new Error("The campus-media approval check profile is missing.");
  const profile = pipeline.profiles["campus-responsive"];
  if (!profile || !Array.isArray(profile.widths) || !profile.widths.length) throw new Error("The campus-responsive delivery profile is missing.");

  const recordsById = new Map(manifest.records.map((record) => [record.id, record]));
  const expectedRecordIds = Object.keys(campusMediaPublicationRoles) as CampusRecordId[];
  const packetRecordIds = manifest.records
    .filter((record) => record.kind === "media" && record.checkProfile === "campus-media")
    .map((record) => record.id);
  if (packetRecordIds.length !== expectedRecordIds.length || packetRecordIds.some((recordId) => !expectedRecordIds.includes(recordId as CampusRecordId))) {
    throw new Error("Campus media capture records have drifted from the four homepage roles.");
  }
  for (const recordId of expectedRecordIds) {
    const record = recordsById.get(recordId);
    if (!record || record.kind !== "media" || record.checkProfile !== "campus-media") {
      throw new Error(`Campus media capture packet is missing canonical record ${recordId}.`);
    }
    if (profileChecks.some((check) => !(check in record.checks)) || Object.keys(record.checks).some((check) => !profileChecks.includes(check))) {
      throw new Error(`${recordId} does not match the canonical campus-media approval checks.`);
    }
  }
}

export function createCampusMediaCapturePacket(options: {
  generatedAt?: Date | string | number;
  manifest?: CaptureManifest;
  pipeline?: PipelineConfig;
  registry?: CampusMediaPublicationRegistryInput;
} = {}) {
  const generatedAt = isoDateTime(options.generatedAt);
  const manifest = options.manifest ?? manifestData as unknown as CaptureManifest;
  const pipeline = options.pipeline ?? pipelineData as unknown as PipelineConfig;
  const registry = options.registry ?? campusMediaPublicationRegistry;
  assertPacketSources(manifest, pipeline);

  const publication = campusMediaPublicationSummary({ registry, manifest, now: generatedAt });
  const activeBindings = createCampusMediaPublicationIndex({ registry, manifest, now: generatedAt });
  const profile = pipeline.profiles["campus-responsive"];
  const profileChecks = manifest.checkProfiles["campus-media"];
  const recordsById = new Map(manifest.records.map((record) => [record.id, record]));
  const shots = (Object.entries(campusMediaPublicationRoles) as [CampusRecordId, string][])
    .map(([recordId, role]) => {
      const record = recordsById.get(recordId) as ManifestRecord;
      const direction = captureDirectionByRecordId[recordId];
      const active = activeBindings.has(recordId);
      return {
        recordId,
        role,
        captureOrder: direction.captureOrder,
        title: record.title,
        homepageUse: direction.homepageUse,
        publicTargets: record.publicTargets,
        direction: direction.direction,
        avoid: direction.avoid,
        approval: {
          decision: record.decision,
          checks: profileChecks.map((check) => ({ id: check, state: record.checks[check] })),
          controlledEvidenceReferencesRecorded: record.evidenceReferences.length,
        },
        activation: {
          active,
          nextStep: active
            ? "active"
            : record.decision === "approved"
              ? "publish-and-activate-exact-derivatives"
              : "capture-review-and-manifest-approval",
        },
        operatorWorkflow: {
          inspect: `npm run media:inspect -- --record ${recordId} --input \"CONTROLLED_PATH\"`,
          prepare: `npm run media:prepare -- --record ${recordId} --input \"CONTROLLED_PATH\"`,
          approvalTemplate: `npm run approvals:update -- --record ${recordId}`,
          approvalPlan: `npm run approvals:update -- --request \"CONTROLLED_REQUEST_PATH\"`,
          approvalApply: `npm run approvals:update -- --request \"CONTROLLED_REQUEST_PATH\" --apply --acknowledge-local-write=record-controlled-publication-approval`,
          publish: `npm run media:publish -- --record ${recordId} --input \"CONTROLLED_PATH\"`,
          activationPlan: `npm run media:activate -- --record ${recordId}`,
        },
      };
    })
    .sort((left, right) => left.captureOrder - right.captureOrder);
  const approvedRecords = shots.filter((shot) => shot.approval.decision === "approved").length;
  const status = publication.releaseReady
    ? "ready-for-homepage-use"
    : approvedRecords === shots.length
      ? "publication-activation-required"
      : "capture-and-approval-required";

  return {
    packetVersion: 2,
    packetId: "sskem-campus-media-capture-handoff",
    generatedAt,
    status,
    manifestSnapshot: { manifestId: manifest.manifestId, updatedOn: manifest.updatedOn },
    summary: {
      requiredShots: shots.length,
      approvedRecords,
      activeBindings: publication.valid,
    },
    delivery: {
      acceptedMasterFormats: pipeline.allowedInputFormats,
      acceptedColourSpaces: pipeline.allowedColourSpaces,
      minimumMaster: pipeline.minimumMaster,
      composition: "uncropped; preserve the source aspect ratio",
      responsiveWidths: profile.widths,
      derivativeFormats: Object.entries(profile.formats).map(([format, settings]) => ({ format, maximumBytes: settings.maximumBytes })),
      embeddedMetadata: "EXIF, XMP and IPTC removed from every public derivative",
    },
    shots,
    approvalBoundary: {
      requiredChecks: profileChecks,
      evidenceInstruction: "Store evidence and approver identity in the school-controlled system; place only opaque references in the canonical manifest.",
    },
    guardrails: {
      externalWritePerformed: false,
      approvalGrantedByPacket: false,
      sourcePathsIncluded: false,
      privateEvidenceIncluded: false,
      approverIdentitiesIncluded: false,
      pupilPhotographyRequested: false,
    },
  } as const;
}
