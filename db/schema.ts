import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const documentCategories = sqliteTable(
  "document_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_document_categories_name").on(table.name),
    uniqueIndex("uq_document_categories_slug").on(table.slug),
    index("idx_document_categories_active_order").on(table.isActive, table.displayOrder),
  ],
);

export const documents = sqliteTable(
  "documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicTitle: text("public_title").notNull(),
    slug: text("slug").notNull(),
    categoryId: integer("category_id").notNull().references(() => documentCategories.id),
    institutionId: text("institution_id").notNull().default("sskem-cbse-school"),
    academicYearId: text("academic_year_id"),
    issuingAuthority: text("issuing_authority"),
    issueDate: text("issue_date"),
    effectiveDate: text("effective_date"),
    expiryDate: text("expiry_date"),
    language: text("language").notNull().default("English"),
    validityStatus: text("validity_status").notNull().default("action_required"),
    internalOwnerId: text("internal_owner_id"),
    currentVersionId: integer("current_version_id"),
    replacementDocumentId: integer("replacement_document_id"),
    isMandatoryDisclosure: integer("is_mandatory_disclosure", { mode: "boolean" }).notNull().default(false),
    appendixSection: text("appendix_section"),
    appendixRow: integer("appendix_row"),
    publishedAt: text("published_at"),
    lastReviewedAt: text("last_reviewed_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_documents_slug").on(table.slug),
    uniqueIndex("uq_documents_appendix_position")
      .on(table.appendixSection, table.appendixRow)
      .where(sql`${table.isMandatoryDisclosure} = 1 AND ${table.appendixRow} IS NOT NULL`),
    index("idx_documents_archive_filter").on(table.categoryId, table.validityStatus, table.publishedAt),
    index("idx_documents_expiry_status").on(table.expiryDate, table.validityStatus),
    index("idx_documents_replacement").on(table.replacementDocumentId),
  ],
);

export const documentVersions = sqliteTable(
  "document_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("document_id").notNull().references(() => documents.id),
    versionLabel: text("version_label").notNull(),
    revisionDate: text("revision_date").notNull(),
    publicFileId: text("public_file_id"),
    privateOriginalFileId: text("private_original_file_id"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    accessibilityStatus: text("accessibility_status").notNull(),
    redactionStatus: text("redaction_status").notNull(),
    malwareScanStatus: text("malware_scan_status").notNull().default("pending"),
    passwordProtected: integer("password_protected", { mode: "boolean" }).notNull().default(false),
    embeddedScriptStatus: text("embedded_script_status").notNull().default("unchecked"),
    uploadedBy: text("uploaded_by").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    publicationStatus: text("publication_status").notNull().default("draft"),
    supersedesVersionId: integer("supersedes_version_id"),
    createdAt,
  },
  (table) => [
    uniqueIndex("uq_document_versions_checksum").on(table.checksumSha256),
    uniqueIndex("uq_document_versions_label").on(table.documentId, table.versionLabel),
    index("idx_document_versions_document_revision").on(table.documentId, table.revisionDate),
    index("idx_document_versions_publication").on(table.publicationStatus, table.approvedAt),
  ],
);

export const documentWorkflowEvents = sqliteTable(
  "document_workflow_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentVersionId: integer("document_version_id").notNull().references(() => documentVersions.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").notNull(),
    comment: text("comment"),
    createdAt,
  },
  (table) => [index("idx_workflow_events_version_created").on(table.documentVersionId, table.createdAt)],
);

export const documentLinkChecks = sqliteTable(
  "document_link_checks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("document_id").notNull().references(() => documents.id),
    checkedUrl: text("checked_url").notNull(),
    httpStatus: integer("http_status"),
    responseTime: integer("response_time"),
    checkedAt: text("checked_at").notNull(),
    failureCount: integer("failure_count").notNull().default(0),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("idx_link_checks_document_checked").on(table.documentId, table.checkedAt),
    index("idx_link_checks_unresolved_failures").on(table.failureCount, table.resolvedAt),
  ],
);

export const documentNotifications = sqliteTable(
  "document_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("document_id").notNull().references(() => documents.id),
    notificationType: text("notification_type").notNull(),
    scheduledFor: text("scheduled_for").notNull(),
    recipientId: text("recipient_id").notNull(),
    sentAt: text("sent_at"),
    status: text("status").notNull().default("scheduled"),
    createdAt,
  },
  (table) => [index("idx_notifications_due").on(table.status, table.scheduledFor)],
);

export const complianceSnapshots = sqliteTable(
  "compliance_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotDate: text("snapshot_date").notNull(),
    mpdPageScreenshot: text("mpd_page_screenshot"),
    documentManifest: text("document_manifest").notNull(),
    brokenLinkReport: text("broken_link_report").notNull(),
    approvedBy: text("approved_by").notNull(),
    notes: text("notes"),
    createdAt,
  },
  (table) => [uniqueIndex("uq_compliance_snapshots_date").on(table.snapshotDate)],
);

export const boardResults = sqliteTable(
  "board_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classLevel: text("class_level").notNull(),
    academicYear: text("academic_year").notNull(),
    registeredStudents: integer("registered_students").notNull(),
    passedStudents: integer("passed_students").notNull(),
    passPercentageBasisPoints: integer("pass_percentage_basis_points").notNull(),
    remarks: text("remarks"),
    publicationStatus: text("publication_status").notNull().default("draft"),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_board_results_class_year").on(table.classLevel, table.academicYear),
    index("idx_board_results_publication").on(table.publicationStatus, table.academicYear),
  ],
);

export const publicStaffRecords = sqliteTable(
  "public_staff_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    designation: text("designation").notNull(),
    qualification: text("qualification").notNull(),
    staffCategory: text("staff_category").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (table) => [index("idx_public_staff_category_order").on(table.staffCategory, table.displayOrder)],
);

export const infrastructureFacts = sqliteTable(
  "infrastructure_facts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    factKey: text("fact_key").notNull(),
    label: text("label").notNull(),
    publicValue: text("public_value"),
    unit: text("unit"),
    verificationStatus: text("verification_status").notNull().default("draft"),
    evidenceDocumentId: integer("evidence_document_id").references(() => documents.id),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_infrastructure_facts_key").on(table.factKey)],
);

export * from "./admissions-schema";
