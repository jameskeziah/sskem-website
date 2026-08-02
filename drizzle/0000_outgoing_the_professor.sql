CREATE TABLE `board_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_level` text NOT NULL,
	`academic_year` text NOT NULL,
	`registered_students` integer NOT NULL,
	`passed_students` integer NOT NULL,
	`pass_percentage_basis_points` integer NOT NULL,
	`remarks` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_board_results_class_year` ON `board_results` (`class_level`,`academic_year`);--> statement-breakpoint
CREATE INDEX `idx_board_results_publication` ON `board_results` (`publication_status`,`academic_year`);--> statement-breakpoint
CREATE TABLE `compliance_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_date` text NOT NULL,
	`mpd_page_screenshot` text,
	`document_manifest` text NOT NULL,
	`broken_link_report` text NOT NULL,
	`approved_by` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compliance_snapshots_date` ON `compliance_snapshots` (`snapshot_date`);--> statement-breakpoint
CREATE TABLE `document_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_document_categories_name` ON `document_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_document_categories_slug` ON `document_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_document_categories_active_order` ON `document_categories` (`is_active`,`display_order`);--> statement-breakpoint
CREATE TABLE `document_link_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`checked_url` text NOT NULL,
	`http_status` integer,
	`response_time` integer,
	`checked_at` text NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_link_checks_document_checked` ON `document_link_checks` (`document_id`,`checked_at`);--> statement-breakpoint
CREATE INDEX `idx_link_checks_unresolved_failures` ON `document_link_checks` (`failure_count`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `document_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`recipient_id` text NOT NULL,
	`sent_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_due` ON `document_notifications` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`version_label` text NOT NULL,
	`revision_date` text NOT NULL,
	`public_file_id` text,
	`private_original_file_id` text,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`accessibility_status` text NOT NULL,
	`redaction_status` text NOT NULL,
	`malware_scan_status` text DEFAULT 'pending' NOT NULL,
	`password_protected` integer DEFAULT false NOT NULL,
	`embedded_script_status` text DEFAULT 'unchecked' NOT NULL,
	`uploaded_by` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`supersedes_version_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_document_versions_checksum` ON `document_versions` (`checksum_sha256`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_document_versions_label` ON `document_versions` (`document_id`,`version_label`);--> statement-breakpoint
CREATE INDEX `idx_document_versions_document_revision` ON `document_versions` (`document_id`,`revision_date`);--> statement-breakpoint
CREATE INDEX `idx_document_versions_publication` ON `document_versions` (`publication_status`,`approved_at`);--> statement-breakpoint
CREATE TABLE `document_workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_version_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_id` text NOT NULL,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_events_version_created` ON `document_workflow_events` (`document_version_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_title` text NOT NULL,
	`slug` text NOT NULL,
	`category_id` integer NOT NULL,
	`institution_id` text DEFAULT 'sskem-cbse-school' NOT NULL,
	`academic_year_id` text,
	`issuing_authority` text,
	`issue_date` text,
	`effective_date` text,
	`expiry_date` text,
	`language` text DEFAULT 'English' NOT NULL,
	`validity_status` text DEFAULT 'action_required' NOT NULL,
	`internal_owner_id` text,
	`current_version_id` integer,
	`replacement_document_id` integer,
	`is_mandatory_disclosure` integer DEFAULT false NOT NULL,
	`appendix_section` text,
	`appendix_row` integer,
	`published_at` text,
	`last_reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `document_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_documents_slug` ON `documents` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_documents_appendix_position` ON `documents` (`appendix_section`,`appendix_row`) WHERE "documents"."is_mandatory_disclosure" = 1 AND "documents"."appendix_row" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_documents_archive_filter` ON `documents` (`category_id`,`validity_status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_documents_expiry_status` ON `documents` (`expiry_date`,`validity_status`);--> statement-breakpoint
CREATE INDEX `idx_documents_replacement` ON `documents` (`replacement_document_id`);--> statement-breakpoint
CREATE TABLE `infrastructure_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fact_key` text NOT NULL,
	`label` text NOT NULL,
	`public_value` text,
	`unit` text,
	`verification_status` text DEFAULT 'draft' NOT NULL,
	`evidence_document_id` integer,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evidence_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_infrastructure_facts_key` ON `infrastructure_facts` (`fact_key`);--> statement-breakpoint
CREATE TABLE `public_staff_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`designation` text NOT NULL,
	`qualification` text NOT NULL,
	`staff_category` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_public_staff_category_order` ON `public_staff_records` (`staff_category`,`display_order`);
--> statement-breakpoint
PRAGMA optimize;
