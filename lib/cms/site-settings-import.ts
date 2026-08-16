// @ts-expect-error Node's native type-stripping test runner requires the explicit TypeScript extension.
import { createSiteSettingsMigrationPacket } from "./site-settings-migration.ts";

type UnknownRecord = Record<string, unknown>;
type ImportEnvironment = Record<string, string | undefined>;
type MigrationPacketOptions = Parameters<typeof createSiteSettingsMigrationPacket>[0];
type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const projectIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const datasetPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const apiVersionPattern = /^\d{4}-\d{2}-\d{2}$/;

export const SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT = "cms-site-settings-first-record";
export const SITE_SETTINGS_DRAFT_ID = "drafts.site-settings";

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function importConfiguration(environment: ImportEnvironment) {
  const projectId = environment.SANITY_PROJECT_ID?.trim();
  const dataset = environment.SANITY_DATASET?.trim();
  const apiVersion = environment.SANITY_API_VERSION?.trim() || "2026-08-12";
  const token = environment.SANITY_IMPORT_TOKEN;
  const issues: string[] = [];

  if (typeof projectId !== "string" || !projectIdPattern.test(projectId)) issues.push("SANITY_PROJECT_ID is missing or invalid.");
  if (typeof dataset !== "string" || !datasetPattern.test(dataset)) issues.push("SANITY_DATASET is missing or invalid.");
  if (typeof apiVersion !== "string" || !apiVersionPattern.test(apiVersion) || Number.isNaN(Date.parse(`${apiVersion}T00:00:00.000Z`))) {
    issues.push("SANITY_API_VERSION must be a valid YYYY-MM-DD date.");
  }
  if (typeof token !== "string" || token.trim().length === 0) issues.push("SANITY_IMPORT_TOKEN is required only for the explicit external write.");
  if (issues.length) throw new Error(`Site settings import configuration failed: ${issues.join(" ")}`);

  return { projectId: projectId as string, dataset: dataset as string, apiVersion, token: token as string };
}

export function createSiteSettingsImportPlan(options: MigrationPacketOptions = {}) {
  const packet = createSiteSettingsMigrationPacket(options);
  const draftDocument = {
    ...packet.sanityDraft,
    _id: SITE_SETTINGS_DRAFT_ID,
  };

  return {
    planVersion: 1,
    migrationId: packet.migrationId,
    status: packet.status === "ready-for-manual-draft" ? "ready-for-explicit-write" : "blocked",
    blockingApprovalRecordIds: packet.blockingApprovalRecordIds,
    target: {
      contentType: packet.target.contentType,
      publishedDocumentId: packet.target.documentId,
      draftDocumentId: SITE_SETTINGS_DRAFT_ID,
    },
    mutation: {
      mutations: [{ create: draftDocument }],
    },
    guardrails: {
      externalWritePerformed: false,
      defaultMode: "local-plan",
      mutationType: "create",
      overwriteAllowed: false,
      publicationState: "draft",
      privateDataIncluded: false,
      approvalGrantedByImporter: false,
    },
  } as const;
}

export async function executeSiteSettingsDraftImport(options: {
  apply?: boolean;
  acknowledgement?: string;
  environment?: ImportEnvironment;
  fetchImpl?: FetchImplementation;
  migration?: MigrationPacketOptions;
} = {}) {
  const plan = createSiteSettingsImportPlan(options.migration);
  if (!options.apply) return { mode: "local-plan", plan } as const;

  if (plan.status !== "ready-for-explicit-write") {
    throw new Error(`Site settings import is blocked by: ${plan.blockingApprovalRecordIds.join(", ")}. No external request was made.`);
  }
  if (options.acknowledgement !== SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT) {
    throw new Error(`Site settings import requires --acknowledge-external-write=${SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT}. No external request was made.`);
  }

  const configuration = importConfiguration(options.environment ?? process.env);
  const endpoint = new URL(
    `https://${configuration.projectId}.api.sanity.io/v${configuration.apiVersion}/data/mutate/${encodeURIComponent(configuration.dataset)}`,
  );
  endpoint.searchParams.set("returnIds", "true");
  endpoint.searchParams.set("returnDocuments", "true");
  endpoint.searchParams.set("visibility", "sync");
  endpoint.searchParams.set("tag", "sskem.site-settings-first-draft");

  let response: Response;
  try {
    response = await (options.fetchImpl ?? globalThis.fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${configuration.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(plan.mutation),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("The Sanity request outcome could not be confirmed. Inspect the draft and transaction history before retrying.");
  }

  if (!response.ok) {
    throw new Error(`Sanity rejected the create-only draft import with HTTP ${response.status}. No overwrite was attempted.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Sanity accepted the request but returned an unreadable receipt. Inspect the draft and transaction history before retrying.");
  }
  const result = isRecord(payload) && Array.isArray(payload.results) ? payload.results[0] : null;
  if (
    !isRecord(payload)
    || typeof payload.transactionId !== "string"
    || payload.transactionId.length === 0
    || !isRecord(result)
    || result.operation !== "create"
    || result.documentId !== SITE_SETTINGS_DRAFT_ID
  ) {
    throw new Error("Sanity accepted the request but its receipt did not confirm the expected draft creation. Inspect the draft and transaction history before retrying.");
  }

  return {
    mode: "external-create",
    receipt: {
      receiptVersion: 1,
      migrationId: plan.migrationId,
      transactionId: payload.transactionId,
      operation: result.operation,
      target: {
        projectId: configuration.projectId,
        dataset: configuration.dataset,
        documentId: SITE_SETTINGS_DRAFT_ID,
        contentType: plan.target.contentType,
      },
      approvalRecordIds: plan.mutation.mutations[0].create.publication.approvalRecordIds,
      externalWritePerformed: true,
      overwriteAllowed: false,
      publicationState: "draft",
    },
  } as const;
}
