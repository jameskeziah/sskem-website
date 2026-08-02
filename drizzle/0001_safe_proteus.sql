CREATE TABLE `admission_age_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`academic_year` text NOT NULL,
	`institution_id` text NOT NULL,
	`class_id` text NOT NULL,
	`cutoff_date` text,
	`minimum_age_years` integer,
	`minimum_age_months` integer,
	`maximum_age_years` integer,
	`minimum_dob` text,
	`maximum_dob` text,
	`relaxation_days` integer DEFAULT 0 NOT NULL,
	`relaxation_authority` text,
	`authority` text DEFAULT 'Government of Maharashtra' NOT NULL,
	`government_order_reference` text,
	`government_order_document_id` integer,
	`effective_from` text,
	`effective_until` text,
	`verified_by` text,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_age_rules_year_institution_class` ON `admission_age_rules` (`academic_year`,`institution_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `idx_admission_age_rules_publication_gate` ON `admission_age_rules` (`verified_at`,`effective_from`,`effective_until`);--> statement-breakpoint
CREATE TABLE `admission_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_number` text NOT NULL,
	`enquiry_id` integer,
	`admission_cycle_id` integer NOT NULL,
	`institution_id` text NOT NULL,
	`class_id` text NOT NULL,
	`admission_category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text,
	`last_saved_at` text,
	`eligibility_status` text DEFAULT 'not_checked' NOT NULL,
	`decision` text,
	`decision_reason_code` text,
	`offered_at` text,
	`offer_expires_at` text,
	`admitted_at` text,
	`admission_number` text,
	`retention_until` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`enquiry_id`) REFERENCES `admission_enquiries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admission_cycle_id`) REFERENCES `admission_cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_applications_number` ON `admission_applications` (`application_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_applications_admission_number` ON `admission_applications` (`admission_number`) WHERE "admission_applications"."admission_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_admission_applications_cycle_status` ON `admission_applications` (`admission_cycle_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admission_applications_retention` ON `admission_applications` (`status`,`retention_until`);--> statement-breakpoint
CREATE TABLE `admission_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`institution_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`previous_status` text,
	`new_status` text,
	`reason_code` text,
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admission_audit_log_entity_created` ON `admission_audit_log` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admission_audit_log_actor_created` ON `admission_audit_log` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `admission_class_availability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admission_cycle_id` integer NOT NULL,
	`class_id` text NOT NULL,
	`section_capacity` integer,
	`available_seats` integer,
	`application_status` text DEFAULT 'configuration_required' NOT NULL,
	`waiting_list_enabled` integer DEFAULT false NOT NULL,
	`age_rule_id` integer,
	`application_fee_paise` integer,
	`registration_fee_paise` integer,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admission_cycle_id`) REFERENCES `admission_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`age_rule_id`) REFERENCES `admission_age_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_class_availability_cycle_class` ON `admission_class_availability` (`admission_cycle_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `idx_admission_class_availability_public` ON `admission_class_availability` (`application_status`,`admission_cycle_id`);--> statement-breakpoint
CREATE TABLE `admission_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`institution_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`applications_open_at` text,
	`applications_close_at` text,
	`default_status` text DEFAULT 'configuration_required' NOT NULL,
	`public_message` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_cycles_institution_year` ON `admission_cycles` (`institution_id`,`academic_year`);--> statement-breakpoint
CREATE INDEX `idx_admission_cycles_status_dates` ON `admission_cycles` (`default_status`,`applications_open_at`,`applications_close_at`);--> statement-breakpoint
CREATE TABLE `admission_enquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference_number` text NOT NULL,
	`academic_year` text NOT NULL,
	`institution_id` text NOT NULL,
	`class_id` text NOT NULL,
	`child_name_encrypted` text NOT NULL,
	`child_dob_encrypted` text,
	`child_identity_hash` text,
	`parent_name_encrypted` text NOT NULL,
	`mobile_encrypted` text NOT NULL,
	`mobile_lookup_hash` text NOT NULL,
	`email_encrypted` text,
	`email_lookup_hash` text,
	`area_encrypted` text,
	`current_school_encrypted` text,
	`current_class` text,
	`current_board` text,
	`preferred_contact_method` text NOT NULL,
	`transport_required` integer DEFAULT false NOT NULL,
	`visit_requested` integer DEFAULT false NOT NULL,
	`source` text,
	`campaign` text,
	`assigned_to` text,
	`status` text DEFAULT 'new' NOT NULL,
	`consent_at` text NOT NULL,
	`consent_notice_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_enquiries_reference` ON `admission_enquiries` (`reference_number`);--> statement-breakpoint
CREATE INDEX `idx_admission_enquiries_assignment_status` ON `admission_enquiries` (`assigned_to`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admission_enquiries_duplicate_mobile` ON `admission_enquiries` (`mobile_lookup_hash`,`academic_year`,`status`);--> statement-breakpoint
CREATE INDEX `idx_admission_enquiries_duplicate_email` ON `admission_enquiries` (`email_lookup_hash`,`academic_year`,`status`);--> statement-breakpoint
CREATE INDEX `idx_admission_enquiries_duplicate_child` ON `admission_enquiries` (`child_identity_hash`,`academic_year`,`status`);--> statement-breakpoint
CREATE TABLE `admission_notification_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`enquiry_id` integer,
	`channel` text NOT NULL,
	`template_code` text NOT NULL,
	`encrypted_recipient` text NOT NULL,
	`consent_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_for` text NOT NULL,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enquiry_id`) REFERENCES `admission_enquiries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consent_id`) REFERENCES `application_consents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admission_notification_outbox_due` ON `admission_notification_outbox` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `admission_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`public_token` text NOT NULL,
	`class_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`conditions_encrypted` text,
	`offered_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`status` text DEFAULT 'offered' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_offers_public_token` ON `admission_offers` (`public_token`);--> statement-breakpoint
CREATE TABLE `admission_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`payment_type` text NOT NULL,
	`payment_reference` text NOT NULL,
	`status` text NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	`receipt_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_payments_reference` ON `admission_payments` (`payment_reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_payments_receipt` ON `admission_payments` (`receipt_number`) WHERE "admission_payments"."receipt_number" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `admission_staff_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_user_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`role` text NOT NULL,
	`assigned_by` text NOT NULL,
	`assigned_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_admission_staff_roles_active` ON `admission_staff_roles` (`staff_user_id`,`institution_id`,`role`) WHERE "admission_staff_roles"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_admission_staff_roles_lookup` ON `admission_staff_roles` (`staff_user_id`,`institution_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `applicant_academic_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`previous_school_encrypted` text,
	`previous_board` text,
	`current_class` text,
	`last_completed_class` text,
	`report_card_summary_encrypted` text,
	`subjects_encrypted` text,
	`languages_encrypted` text,
	`transfer_reason_encrypted` text,
	`previous_admission_number_encrypted` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_applicant_academic_history_application` ON `applicant_academic_history` (`application_id`);--> statement-breakpoint
CREATE TABLE `applicant_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`address_type` text NOT NULL,
	`address_encrypted` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_applicant_addresses_application_type` ON `applicant_addresses` (`application_id`,`address_type`);--> statement-breakpoint
CREATE TABLE `applicant_guardians` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`name_encrypted` text NOT NULL,
	`relationship` text NOT NULL,
	`mobile_encrypted` text NOT NULL,
	`email_encrypted` text,
	`address_encrypted` text,
	`is_emergency_contact` integer DEFAULT false NOT NULL,
	`is_authorised_pickup` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_applicant_guardians_application` ON `applicant_guardians` (`application_id`);--> statement-breakpoint
CREATE TABLE `applicant_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`legal_name_encrypted` text NOT NULL,
	`preferred_name_encrypted` text,
	`date_of_birth_encrypted` text NOT NULL,
	`gender_encrypted` text,
	`place_of_birth_encrypted` text,
	`nationality_encrypted` text,
	`mother_tongue_encrypted` text,
	`photograph_object_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_applicant_students_application` ON `applicant_students` (`application_id`);--> statement-breakpoint
CREATE TABLE `applicant_support_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`encrypted_payload` text NOT NULL,
	`access_classification` text DEFAULT 'restricted_support' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_applicant_support_records_application` ON `applicant_support_records` (`application_id`);--> statement-breakpoint
CREATE TABLE `application_consents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`consent_type` text NOT NULL,
	`notice_version` text NOT NULL,
	`granted` integer NOT NULL,
	`consent_at` text NOT NULL,
	`withdrawn_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_application_consents_application_type` ON `application_consents` (`application_id`,`consent_type`,`consent_at`);--> statement-breakpoint
CREATE TABLE `application_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`decision` text NOT NULL,
	`reason_code` text NOT NULL,
	`decided_by` text NOT NULL,
	`decided_at` text NOT NULL,
	`supersedes_decision_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_application_decisions_application_decided` ON `application_decisions` (`application_id`,`decided_at`);--> statement-breakpoint
CREATE TABLE `application_document_access_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_document_id` integer NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_document_id`) REFERENCES `application_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_application_document_access_events_document_created` ON `application_document_access_events` (`application_document_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `application_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`public_token` text NOT NULL,
	`document_type` text NOT NULL,
	`private_object_key` text NOT NULL,
	`original_file_name_encrypted` text NOT NULL,
	`declared_mime_type` text NOT NULL,
	`detected_mime_type` text,
	`file_size` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`malware_scan_status` text DEFAULT 'pending' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_by` text,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_application_documents_public_token` ON `application_documents` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_application_documents_checksum` ON `application_documents` (`application_id`,`checksum_sha256`);--> statement-breakpoint
CREATE INDEX `idx_application_documents_review` ON `application_documents` (`application_id`,`verification_status`);--> statement-breakpoint
CREATE TABLE `application_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`interaction_type` text NOT NULL,
	`occurred_at` text NOT NULL,
	`recorded_by` text NOT NULL,
	`encrypted_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_application_interactions_application_occurred` ON `application_interactions` (`application_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `application_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`requirement_code` text NOT NULL,
	`status` text DEFAULT 'outstanding' NOT NULL,
	`due_at` text,
	`satisfied_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_application_requirements_application_code` ON `application_requirements` (`application_id`,`requirement_code`);--> statement-breakpoint
CREATE TABLE `application_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`previous_status` text,
	`new_status` text NOT NULL,
	`actor_id` text NOT NULL,
	`reason_code` text NOT NULL,
	`parent_message` text,
	`parent_action_required` text,
	`parent_deadline` text,
	`parent_notification_status` text DEFAULT 'not_requested' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_application_status_history_application_created` ON `application_status_history` (`application_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `parent_otp_challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`public_token` text NOT NULL,
	`mobile_lookup_hash` text NOT NULL,
	`otp_hash` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_parent_otp_challenges_public_token` ON `parent_otp_challenges` (`public_token`);--> statement-breakpoint
CREATE INDEX `idx_parent_otp_challenges_expiry` ON `parent_otp_challenges` (`expires_at`,`consumed_at`);--> statement-breakpoint
CREATE TABLE `school_visit_bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_token` text NOT NULL,
	`enquiry_id` integer,
	`application_id` integer,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`accessibility_support_encrypted` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`enquiry_id`) REFERENCES `admission_enquiries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `admission_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_school_visit_bookings_public_token` ON `school_visit_bookings` (`public_token`);--> statement-breakpoint
CREATE INDEX `idx_school_visit_bookings_schedule_status` ON `school_visit_bookings` (`scheduled_at`,`status`);