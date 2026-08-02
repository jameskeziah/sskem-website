import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const admissionCycles = sqliteTable(
  "admission_cycles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    institutionId: text("institution_id").notNull(),
    academicYear: text("academic_year").notNull(),
    applicationsOpenAt: text("applications_open_at"),
    applicationsCloseAt: text("applications_close_at"),
    defaultStatus: text("default_status").notNull().default("configuration_required"),
    publicMessage: text("public_message").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_admission_cycles_institution_year").on(table.institutionId, table.academicYear),
    index("idx_admission_cycles_status_dates").on(table.defaultStatus, table.applicationsOpenAt, table.applicationsCloseAt),
  ],
);

export const admissionAgeRules = sqliteTable(
  "admission_age_rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    academicYear: text("academic_year").notNull(),
    institutionId: text("institution_id").notNull(),
    classId: text("class_id").notNull(),
    cutoffDate: text("cutoff_date"),
    minimumAgeYears: integer("minimum_age_years"),
    minimumAgeMonths: integer("minimum_age_months"),
    maximumAgeYears: integer("maximum_age_years"),
    minimumDob: text("minimum_dob"),
    maximumDob: text("maximum_dob"),
    relaxationDays: integer("relaxation_days").notNull().default(0),
    relaxationAuthority: text("relaxation_authority"),
    authority: text("authority").notNull().default("Government of Maharashtra"),
    governmentOrderReference: text("government_order_reference"),
    governmentOrderDocumentId: integer("government_order_document_id"),
    effectiveFrom: text("effective_from"),
    effectiveUntil: text("effective_until"),
    verifiedBy: text("verified_by"),
    verifiedAt: text("verified_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_admission_age_rules_year_institution_class").on(table.academicYear, table.institutionId, table.classId),
    index("idx_admission_age_rules_publication_gate").on(table.verifiedAt, table.effectiveFrom, table.effectiveUntil),
  ],
);

export const admissionClassAvailability = sqliteTable(
  "admission_class_availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    admissionCycleId: integer("admission_cycle_id").notNull().references(() => admissionCycles.id),
    classId: text("class_id").notNull(),
    sectionCapacity: integer("section_capacity"),
    availableSeats: integer("available_seats"),
    applicationStatus: text("application_status").notNull().default("configuration_required"),
    waitingListEnabled: integer("waiting_list_enabled", { mode: "boolean" }).notNull().default(false),
    ageRuleId: integer("age_rule_id").references(() => admissionAgeRules.id),
    applicationFeePaise: integer("application_fee_paise"),
    registrationFeePaise: integer("registration_fee_paise"),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_admission_class_availability_cycle_class").on(table.admissionCycleId, table.classId),
    index("idx_admission_class_availability_public").on(table.applicationStatus, table.admissionCycleId),
  ],
);

export const admissionEnquiries = sqliteTable(
  "admission_enquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    referenceNumber: text("reference_number").notNull(),
    academicYear: text("academic_year").notNull(),
    institutionId: text("institution_id").notNull(),
    classId: text("class_id").notNull(),
    childNameEncrypted: text("child_name_encrypted").notNull(),
    childDobEncrypted: text("child_dob_encrypted"),
    childIdentityHash: text("child_identity_hash"),
    parentNameEncrypted: text("parent_name_encrypted").notNull(),
    mobileEncrypted: text("mobile_encrypted").notNull(),
    mobileLookupHash: text("mobile_lookup_hash").notNull(),
    emailEncrypted: text("email_encrypted"),
    emailLookupHash: text("email_lookup_hash"),
    areaEncrypted: text("area_encrypted"),
    currentSchoolEncrypted: text("current_school_encrypted"),
    currentClass: text("current_class"),
    currentBoard: text("current_board"),
    preferredContactMethod: text("preferred_contact_method").notNull(),
    transportRequired: integer("transport_required", { mode: "boolean" }).notNull().default(false),
    visitRequested: integer("visit_requested", { mode: "boolean" }).notNull().default(false),
    source: text("source"),
    campaign: text("campaign"),
    assignedTo: text("assigned_to"),
    status: text("status").notNull().default("new"),
    consentAt: text("consent_at").notNull(),
    consentNoticeVersion: text("consent_notice_version").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_admission_enquiries_reference").on(table.referenceNumber),
    index("idx_admission_enquiries_assignment_status").on(table.assignedTo, table.status, table.createdAt),
    index("idx_admission_enquiries_duplicate_mobile").on(table.mobileLookupHash, table.academicYear, table.status),
    index("idx_admission_enquiries_duplicate_email").on(table.emailLookupHash, table.academicYear, table.status),
    index("idx_admission_enquiries_duplicate_child").on(table.childIdentityHash, table.academicYear, table.status),
  ],
);

export const admissionApplications = sqliteTable(
  "admission_applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationNumber: text("application_number").notNull(),
    enquiryId: integer("enquiry_id").references(() => admissionEnquiries.id),
    admissionCycleId: integer("admission_cycle_id").notNull().references(() => admissionCycles.id),
    institutionId: text("institution_id").notNull(),
    classId: text("class_id").notNull(),
    admissionCategory: text("admission_category").notNull(),
    status: text("status").notNull().default("draft"),
    submittedAt: text("submitted_at"),
    lastSavedAt: text("last_saved_at"),
    eligibilityStatus: text("eligibility_status").notNull().default("not_checked"),
    decision: text("decision"),
    decisionReasonCode: text("decision_reason_code"),
    offeredAt: text("offered_at"),
    offerExpiresAt: text("offer_expires_at"),
    admittedAt: text("admitted_at"),
    admissionNumber: text("admission_number"),
    retentionUntil: text("retention_until"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_admission_applications_number").on(table.applicationNumber),
    uniqueIndex("uq_admission_applications_admission_number").on(table.admissionNumber).where(sql`${table.admissionNumber} IS NOT NULL`),
    index("idx_admission_applications_cycle_status").on(table.admissionCycleId, table.status, table.createdAt),
    index("idx_admission_applications_retention").on(table.status, table.retentionUntil),
  ],
);

export const applicantStudents = sqliteTable(
  "applicant_students",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    legalNameEncrypted: text("legal_name_encrypted").notNull(),
    preferredNameEncrypted: text("preferred_name_encrypted"),
    dateOfBirthEncrypted: text("date_of_birth_encrypted").notNull(),
    genderEncrypted: text("gender_encrypted"),
    placeOfBirthEncrypted: text("place_of_birth_encrypted"),
    nationalityEncrypted: text("nationality_encrypted"),
    motherTongueEncrypted: text("mother_tongue_encrypted"),
    photographObjectKey: text("photograph_object_key"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_applicant_students_application").on(table.applicationId)],
);

export const applicantGuardians = sqliteTable(
  "applicant_guardians",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    nameEncrypted: text("name_encrypted").notNull(),
    relationship: text("relationship").notNull(),
    mobileEncrypted: text("mobile_encrypted").notNull(),
    emailEncrypted: text("email_encrypted"),
    addressEncrypted: text("address_encrypted"),
    isEmergencyContact: integer("is_emergency_contact", { mode: "boolean" }).notNull().default(false),
    isAuthorisedPickup: integer("is_authorised_pickup", { mode: "boolean" }).notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [index("idx_applicant_guardians_application").on(table.applicationId)],
);

export const applicantAddresses = sqliteTable(
  "applicant_addresses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    addressType: text("address_type").notNull(),
    addressEncrypted: text("address_encrypted").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_applicant_addresses_application_type").on(table.applicationId, table.addressType)],
);

export const applicantAcademicHistory = sqliteTable(
  "applicant_academic_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    previousSchoolEncrypted: text("previous_school_encrypted"),
    previousBoard: text("previous_board"),
    currentClass: text("current_class"),
    lastCompletedClass: text("last_completed_class"),
    reportCardSummaryEncrypted: text("report_card_summary_encrypted"),
    subjectsEncrypted: text("subjects_encrypted"),
    languagesEncrypted: text("languages_encrypted"),
    transferReasonEncrypted: text("transfer_reason_encrypted"),
    previousAdmissionNumberEncrypted: text("previous_admission_number_encrypted"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_applicant_academic_history_application").on(table.applicationId)],
);

export const applicantSupportRecords = sqliteTable(
  "applicant_support_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    encryptedPayload: text("encrypted_payload").notNull(),
    accessClassification: text("access_classification").notNull().default("restricted_support"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_applicant_support_records_application").on(table.applicationId)],
);

export const applicationDocuments = sqliteTable(
  "application_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    publicToken: text("public_token").notNull(),
    documentType: text("document_type").notNull(),
    privateObjectKey: text("private_object_key").notNull(),
    originalFileNameEncrypted: text("original_file_name_encrypted").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    detectedMimeType: text("detected_mime_type"),
    fileSize: integer("file_size").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    malwareScanStatus: text("malware_scan_status").notNull().default("pending"),
    verificationStatus: text("verification_status").notNull().default("pending"),
    verifiedBy: text("verified_by"),
    verifiedAt: text("verified_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_application_documents_public_token").on(table.publicToken),
    uniqueIndex("uq_application_documents_checksum").on(table.applicationId, table.checksumSha256),
    index("idx_application_documents_review").on(table.applicationId, table.verificationStatus),
  ],
);

export const applicationDocumentAccessEvents = sqliteTable(
  "application_document_access_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationDocumentId: integer("application_document_id").notNull().references(() => applicationDocuments.id),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    createdAt,
  },
  (table) => [index("idx_application_document_access_events_document_created").on(table.applicationDocumentId, table.createdAt)],
);

export const applicationRequirements = sqliteTable(
  "application_requirements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    requirementCode: text("requirement_code").notNull(),
    status: text("status").notNull().default("outstanding"),
    dueAt: text("due_at"),
    satisfiedAt: text("satisfied_at"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_application_requirements_application_code").on(table.applicationId, table.requirementCode)],
);

export const applicationStatusHistory = sqliteTable(
  "application_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    actorId: text("actor_id").notNull(),
    reasonCode: text("reason_code").notNull(),
    parentMessage: text("parent_message"),
    parentActionRequired: text("parent_action_required"),
    parentDeadline: text("parent_deadline"),
    parentNotificationStatus: text("parent_notification_status").notNull().default("not_requested"),
    createdAt,
  },
  (table) => [index("idx_application_status_history_application_created").on(table.applicationId, table.createdAt)],
);

export const applicationInteractions = sqliteTable(
  "application_interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    interactionType: text("interaction_type").notNull(),
    occurredAt: text("occurred_at").notNull(),
    recordedBy: text("recorded_by").notNull(),
    encryptedNotes: text("encrypted_notes"),
    createdAt,
  },
  (table) => [index("idx_application_interactions_application_occurred").on(table.applicationId, table.occurredAt)],
);

export const schoolVisitBookings = sqliteTable(
  "school_visit_bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicToken: text("public_token").notNull(),
    enquiryId: integer("enquiry_id").references(() => admissionEnquiries.id),
    applicationId: integer("application_id").references(() => admissionApplications.id),
    scheduledAt: text("scheduled_at").notNull(),
    status: text("status").notNull().default("requested"),
    accessibilitySupportEncrypted: text("accessibility_support_encrypted"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_school_visit_bookings_public_token").on(table.publicToken),
    index("idx_school_visit_bookings_schedule_status").on(table.scheduledAt, table.status),
  ],
);

export const applicationDecisions = sqliteTable(
  "application_decisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    decision: text("decision").notNull(),
    reasonCode: text("reason_code").notNull(),
    decidedBy: text("decided_by").notNull(),
    decidedAt: text("decided_at").notNull(),
    supersedesDecisionId: integer("supersedes_decision_id"),
    createdAt,
  },
  (table) => [index("idx_application_decisions_application_decided").on(table.applicationId, table.decidedAt)],
);

export const admissionOffers = sqliteTable(
  "admission_offers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    publicToken: text("public_token").notNull(),
    classId: text("class_id").notNull(),
    academicYear: text("academic_year").notNull(),
    conditionsEncrypted: text("conditions_encrypted"),
    offeredAt: text("offered_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    status: text("status").notNull().default("offered"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("uq_admission_offers_public_token").on(table.publicToken)],
);

export const admissionPayments = sqliteTable(
  "admission_payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    amountPaise: integer("amount_paise").notNull(),
    paymentType: text("payment_type").notNull(),
    paymentReference: text("payment_reference").notNull(),
    status: text("status").notNull(),
    recordedBy: text("recorded_by").notNull(),
    recordedAt: text("recorded_at").notNull(),
    receiptNumber: text("receipt_number"),
    createdAt,
  },
  (table) => [
    uniqueIndex("uq_admission_payments_reference").on(table.paymentReference),
    uniqueIndex("uq_admission_payments_receipt").on(table.receiptNumber).where(sql`${table.receiptNumber} IS NOT NULL`),
  ],
);

export const applicationConsents = sqliteTable(
  "application_consents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    consentType: text("consent_type").notNull(),
    noticeVersion: text("notice_version").notNull(),
    granted: integer("granted", { mode: "boolean" }).notNull(),
    consentAt: text("consent_at").notNull(),
    withdrawnAt: text("withdrawn_at"),
    createdAt,
  },
  (table) => [index("idx_application_consents_application_type").on(table.applicationId, table.consentType, table.consentAt)],
);

export const parentOtpChallenges = sqliteTable(
  "parent_otp_challenges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => admissionApplications.id),
    publicToken: text("public_token").notNull(),
    mobileLookupHash: text("mobile_lookup_hash").notNull(),
    otpHash: text("otp_hash").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt,
  },
  (table) => [
    uniqueIndex("uq_parent_otp_challenges_public_token").on(table.publicToken),
    index("idx_parent_otp_challenges_expiry").on(table.expiresAt, table.consumedAt),
  ],
);

export const admissionStaffRoles = sqliteTable(
  "admission_staff_roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    staffUserId: text("staff_user_id").notNull(),
    institutionId: text("institution_id").notNull(),
    role: text("role").notNull(),
    assignedBy: text("assigned_by").notNull(),
    assignedAt: text("assigned_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt,
  },
  (table) => [
    uniqueIndex("uq_admission_staff_roles_active").on(table.staffUserId, table.institutionId, table.role).where(sql`${table.revokedAt} IS NULL`),
    index("idx_admission_staff_roles_lookup").on(table.staffUserId, table.institutionId, table.revokedAt),
  ],
);

export const admissionNotificationOutbox = sqliteTable(
  "admission_notification_outbox",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").references(() => admissionApplications.id),
    enquiryId: integer("enquiry_id").references(() => admissionEnquiries.id),
    channel: text("channel").notNull(),
    templateCode: text("template_code").notNull(),
    encryptedRecipient: text("encrypted_recipient").notNull(),
    consentId: integer("consent_id").references(() => applicationConsents.id),
    status: text("status").notNull().default("pending"),
    scheduledFor: text("scheduled_for").notNull(),
    sentAt: text("sent_at"),
    createdAt,
  },
  (table) => [index("idx_admission_notification_outbox_due").on(table.status, table.scheduledFor)],
);

export const admissionAuditLog = sqliteTable(
  "admission_audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    institutionId: text("institution_id").notNull(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    reasonCode: text("reason_code"),
    metadataJson: text("metadata_json"),
    createdAt,
  },
  (table) => [
    index("idx_admission_audit_log_entity_created").on(table.entityType, table.entityId, table.createdAt),
    index("idx_admission_audit_log_actor_created").on(table.actorId, table.createdAt),
  ],
);
