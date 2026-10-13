# SSKEMS ↔ ProTrack CRM enquiry integration (staged)

**Status:** Implementation branch only. No live data transfer is enabled by default. This does not change the school's controlled publication approval state or activate formal applications, status lookup, uploads, payments, or staff access.

## Ownership and isolation

- Public site: SSKEMS, Veral; the admission enquiry is the only integration entry point.
- CRM API: https://github.com/jameskeziah/coaching_institue_crm_erp, separate Express service.
- **SSKEMS must be its own tenant.** The CRM's existing public enquiry UI defaults to *miraku*. Do not reuse that tenant for SSKEMS.
- The configured branch ID must belong to the SSKEMS tenant. IDs are alphanumeric/prefixed, not necessarily sequential numbers.
- Staff JWT, database credentials, student operations and payment endpoints remain isolated from website visitors.

## Data flow

Browser form → same-origin **POST /api/admissions/enquiry** → server-side validation → HTTPS **POST {SSKEMS_CRM_API_ORIGIN}/api/public/enquiries** → tenant-specific admissions record.

The site does not expose the CRM URL, tenant slug or branch ID in its browser payload. No payment or identity documents are accepted. The parent can submit name, phone, class, academic year, topic, preferred contact method, optional email/message and explicit contact consent. The child's name is not requested at this early stage, and the lead clearly carries a *Not provided (website enquiry)* placeholder until staff follow-up. CRM supplementary fields are stored as JSON in admissions.customFields. Verify they are staff-visible before launch.

**Privacy prerequisite:** Deploy the companion CRM branch, which replaces anonymous duplicate-lead disclosures with a generic acknowledgement and never returns existing names, telephone numbers, lead IDs or statuses. The original CRM route exposes those fields to anonymous callers, including on duplicate warnings.

## Website server configuration

Set only in server-side deployment environment, not in source control. Use these placeholders (the feature stays disabled):

    SSKEMS_CRM_API_ORIGIN=https://YOUR-CRM-API-HOST
    SSKEMS_CRM_TENANT_SLUG=YOUR-SSKEMS-TENANT-SLUG
    SSKEMS_CRM_BRANCH_ID=YOUR-SSKEMS-BRANCH-ID
    SSKEMS_CRM_ENQUIRY_ENABLED=false

The API origin has no /api suffix. HTTPS is required outside localhost development. Keep the final flag false until management, privacy, proper tenant ownership, protected hosting and operational abuse controls are verified.

CRM endpoint contract:
- GET /api/health: service health.
- GET /api/public/branches?tenant=TENANT: active tenant's branch IDs and names.
- POST /api/public/enquiries: public lead creation (tenant, branch, source, campaign provided by website server configuration).

Configure CRM production PostgreSQL, TLS, secure JWT/admin secrets, backups and its required environment variables as defined by server/config/env.js. The two repositories have different runtimes and should not share JWTs or databases.

## Staged launch sequence

1. Provision SSKEMS as an authorized CRM tenant; confirm the exact slug and branch ID from the API. Never assume miraku.
2. Deploy the companion CRM privacy change in staging. Verify duplicate submissions, including requests with ignoreDuplicateWarning=true, disclose no existing lead details.
3. Configure the four server environment settings on a private website staging deployment, initially with enabled=false.
4. Confirm POST /api/admissions/enquiry returns 503 and creates no record while disabled.
5. Configure **edge WAF, distributed IP throttling/bot challenge and logging without request bodies** for both public POST paths. Request validation alone does not provide distributed anti-spam protection. Restrict staff permissions and approve a retention/deletion procedure.
6. Approve the school's privacy notice, consent language, enquiry handling and notification workflows. Existing publication gates are still independent.
7. Turn on the flag in approved staging only; submit synthetic data, confirm correct tenant/branch, class/year, source=WEBSITE, consent, topic and question are present in the CRM and handled by staff. Delete the test record according to policy.
8. Run the website build/integrity and review tests, mobile/accessibility QA, and CRM smoke/regression tests. Passing tests does not independently constitute publication approval.
9. Upon authorized public release, set production values and enable the flag. Verify production with one controlled consented test without logging form bodies.

## Rollback

Set SSKEMS_CRM_ENQUIRY_ENABLED=false. The form reverts to its original preview-only behaviour and the API returns 503. Disabling does not erase previously received enquiries; follow approved retention/deletion procedures.

## Out of scope

No cross-repository imports, shared SSO, student-profile sync, fee/payment sync, certificate uploads or formal applications. Those need separate authenticated contracts, tenant isolation/RBAC review, privacy risk assessment, idempotency and test coverage.
