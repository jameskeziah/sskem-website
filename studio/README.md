# SSKEMS Content Studio

This standalone Sanity Studio is the editorial workspace for public SSKEMS website content. It is intentionally isolated from the root website build and has its own package manifest.

## Content boundary

Only content already suitable for public display belongs here, such as official contact details, approved announcements, published admissions guidance, and public events.

The following are prohibited in this Studio and in Sanity assets:

- applicant or student data;
- private or unapproved PDFs;
- consent forms or consent evidence;
- approver names, email addresses, signatures, or other approver identities;
- controlled evidence, internal approval files, or audit attachments;
- authentication secrets, API tokens, or operational credentials.

`approvalRecordId` is an opaque reference to an approval record held in the school-controlled evidence system. It must never contain an approver's identity or the evidence itself.

## Publication rules

Every document includes the reusable `publication` object. A document marked `published` must have an `approvalRecordId`, `validFrom`, and `validUntil`; Studio validation blocks publication without them. Sanity validation runs in the Studio, so the website's server-only CMS adapter independently enforces the same rule and rejects expired or unapproved content.

Keep Sanity drafts and preview access separate from the public website. Public pages should query only the approved, currently valid projection defined by that adapter.

## Local setup

This Studio uses Sanity 6 and requires Node.js 22.12 or later.

1. Create or select the SSKEMS project and production dataset in Sanity Manage.
2. Copy `.env.example` to `.env.local`.
3. Fill in `SANITY_STUDIO_PROJECT_ID`; keep `SANITY_STUDIO_DATASET=production` unless a separate dataset has been deliberately created.
4. From this `studio` directory, install its dependencies with the same package manager chosen for the Studio.
5. Start the editor with `npm run dev`.

Project IDs and dataset names are public identifiers. Never put read/write/deploy tokens in `SANITY_STUDIO_*` variables because those variables are bundled into the browser application.

## Scripts

- `npm run dev` starts the local Studio.
- `npm run build` creates the standalone Studio bundle.
- `npm run deploy` deploys the Studio using Sanity-managed hosting.
- `npm run typecheck` checks the Studio configuration and schemas.

The first deployment can generate a Studio app ID. If it does, add that value to `SANITY_STUDIO_APP_ID` in the local environment; do not commit a populated environment file.
