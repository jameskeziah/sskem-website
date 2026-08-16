import editorialPublicationBindingsData from "../../content/editorial-publication-bindings.json" with { type: "json" };

export type EditorialContentType = "siteSettings" | "announcement" | "admissionCycle" | "event";

export type EditorialPublicationBinding = {
  bindingId?: unknown;
  approvalRecordId?: unknown;
  contentType?: unknown;
  documentId?: unknown;
  revision?: unknown;
  contentDigestSha256?: unknown;
  boundOn?: unknown;
  ownerRole?: unknown;
  notes?: unknown;
};

export type EditorialPublicationBindingsInput = {
  $schema?: unknown;
  schemaVersion?: unknown;
  registryId?: unknown;
  policy?: {
    privateEvidenceStoredInRepository?: unknown;
    exactRevisionRequired?: unknown;
    exactContentDigestRequired?: unknown;
  };
  bindings?: readonly EditorialPublicationBinding[];
};

type UnknownRecord = Record<string, unknown>;
type BindingIndex = Map<string, string | null>;

const allowedContentTypes = new Set<EditorialContentType>(["siteSettings", "announcement", "admissionCycle", "event"]);
const approvalRecordIdPattern = /^claim-[a-z0-9-]+$/;
const documentIdPattern = /^(?!drafts\.)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const revisionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const digestPattern = /^[a-f0-9]{64}$/;

export const editorialPublicationBindings = editorialPublicationBindingsData as unknown as EditorialPublicationBindingsInput;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Editorial binding projections must contain finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as UnknownRecord;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new TypeError("Editorial binding projections must be JSON-compatible.");
}

export async function digestEditorialProjection(input: {
  contentType: EditorialContentType;
  documentId: string;
  revision: string;
  projection: unknown;
}): Promise<string> {
  const canonical = canonicalJson({
    contentType: input.contentType,
    documentId: input.documentId,
    projection: input.projection,
    revision: input.revision,
  });
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validRegistryPolicy(registry: EditorialPublicationBindingsInput) {
  return registry.$schema === "./editorial-publication-bindings.schema.json"
    && registry.schemaVersion === 1
    && registry.registryId === "sskem-editorial-publication-bindings"
    && registry.policy?.privateEvidenceStoredInRepository === false
    && registry.policy?.exactRevisionRequired === true
    && registry.policy?.exactContentDigestRequired === true;
}

function bindingKey(approvalRecordId: string, contentType: EditorialContentType, documentId: string, revision: string) {
  return `${approvalRecordId}\u0000${contentType}\u0000${documentId}\u0000${revision}`;
}

export function createEditorialBindingIndex(
  registry: EditorialPublicationBindingsInput = editorialPublicationBindings,
): BindingIndex {
  const index: BindingIndex = new Map();
  if (!validRegistryPolicy(registry) || !Array.isArray(registry.bindings)) return index;

  const approvalCounts = new Map<string, number>();
  const documentRevisionCounts = new Map<string, number>();
  const validBindings: {
    approvalRecordId: string;
    contentType: EditorialContentType;
    documentId: string;
    revision: string;
    digest: string;
  }[] = [];

  for (const binding of registry.bindings) {
    if (
      typeof binding?.approvalRecordId !== "string"
      || !approvalRecordIdPattern.test(binding.approvalRecordId)
      || typeof binding.contentType !== "string"
      || !allowedContentTypes.has(binding.contentType as EditorialContentType)
      || typeof binding.documentId !== "string"
      || !documentIdPattern.test(binding.documentId)
      || typeof binding.revision !== "string"
      || !revisionPattern.test(binding.revision)
      || typeof binding.contentDigestSha256 !== "string"
      || !digestPattern.test(binding.contentDigestSha256)
    ) continue;

    const contentType = binding.contentType as EditorialContentType;
    const documentRevision = `${contentType}\u0000${binding.documentId}\u0000${binding.revision}`;
    approvalCounts.set(binding.approvalRecordId, (approvalCounts.get(binding.approvalRecordId) ?? 0) + 1);
    documentRevisionCounts.set(documentRevision, (documentRevisionCounts.get(documentRevision) ?? 0) + 1);
    validBindings.push({
      approvalRecordId: binding.approvalRecordId,
      contentType,
      documentId: binding.documentId,
      revision: binding.revision,
      digest: binding.contentDigestSha256,
    });
  }

  for (const binding of validBindings) {
    const documentRevision = `${binding.contentType}\u0000${binding.documentId}\u0000${binding.revision}`;
    if (approvalCounts.get(binding.approvalRecordId) !== 1 || documentRevisionCounts.get(documentRevision) !== 1) continue;
    index.set(bindingKey(binding.approvalRecordId, binding.contentType, binding.documentId, binding.revision), binding.digest);
  }

  return index;
}

export async function hasMatchingEditorialBinding(input: {
  candidate: UnknownRecord;
  contentType: EditorialContentType;
  projection: unknown;
  index: BindingIndex;
}): Promise<boolean> {
  const { candidate, contentType, projection, index } = input;
  if (
    candidate._type !== contentType
    || typeof candidate._id !== "string"
    || !documentIdPattern.test(candidate._id)
    || typeof candidate._rev !== "string"
    || !revisionPattern.test(candidate._rev)
    || typeof candidate.publication !== "object"
    || candidate.publication === null
    || Array.isArray(candidate.publication)
  ) return false;

  const approvalRecordId = (candidate.publication as UnknownRecord).approvalRecordId;
  if (typeof approvalRecordId !== "string") return false;
  const expectedDigest = index.get(bindingKey(approvalRecordId, contentType, candidate._id, candidate._rev));
  if (!expectedDigest) return false;

  const actualDigest = await digestEditorialProjection({
    contentType,
    documentId: candidate._id,
    revision: candidate._rev,
    projection,
  });
  return actualDigest === expectedDigest;
}

export function editorialPublicationBindingSummary(
  registry: EditorialPublicationBindingsInput = editorialPublicationBindings,
) {
  const index = createEditorialBindingIndex(registry);
  return {
    recorded: Array.isArray(registry.bindings) ? registry.bindings.length : 0,
    valid: index.size,
  };
}
