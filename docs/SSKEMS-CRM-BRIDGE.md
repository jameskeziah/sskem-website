# SSKEMS → ProTrack enquiries

The public school website and internal CRM remain separate. This change wires **short admissions enquiries only**.

```text
Parent /admissions/enquire
  → POST /api/admissions/enquiry (same-origin school server)
  → verify Cloudflare Turnstile, validate fields and consent
  → POST <CRM_API_BASE_URL>/integrations/school/enquiry (server-only key)
  → ProTrack admissions: NEW lead in SSKEMS tenant / branch
```

The school website must be deployed with a working server route; a static-only export cannot deliver enquiries. The CRM Express API must be separately deployed and reachable by HTTPS and backed by a durable database.

## Enabling the integration

1. In ProTrack, create or identify the SSKEMS tenant and branch, then configure `SCHOOL_TENANT_SLUG`, `SCHOOL_BRANCH_ID`, and `SCHOOL_INTEGRATION_KEY` on the **CRM server**. Use the exact branch ID from `GET /api/public/branches?tenant=<slug>`.
2. Create a Cloudflare Turnstile widget allowing the school production hostname and any specifically used staging hostname.
3. On the **SSKEMS server deployment**, configure `SSKEMS_CRM_API_BASE_URL=https://<host>/api/`, `SSKEMS_CRM_BRIDGE_KEY=<same-secret>`, and `TURNSTILE_SECRET_KEY=<server-secret>`. The shared secret must be at least 32 characters. Never use `NEXT_PUBLIC_` for these three values.
4. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site-key>`. Keep `ADMISSIONS_ENQUIRY_ENABLED=false` and `NEXT_PUBLIC_ADMISSIONS_ENQUIRY_ENABLED=false` at this stage.
5. Deploy CRM first, then test the website on a staging hostname with **both** flags enabled. Verify a full enquiry, CRM tenant/branch, question, consent timestamp, duplicate rejection and no PII in error responses.
6. After school management has approved live collection, set **both flags true for Production** and redeploy. No repository merge by itself enables production submission.

### Safeguards

- Parent consent is required. The parent is asked only for a name, child's name, phone, intended class, contact preference, and an optional email/message.
- The bridge validates contact information, academic year and class allowlist, and rejects non-consented requests.
- Server-side Turnstile verification and a honeypot protect the form; configure WAF/rate limiting at the deployed edge for additional protection.
- CRM keys, tenant routing and the database remain server-only. Duplicate errors must not disclose existing student records.
- Formal admission applications, documents, RTE applications, fees, student and parent portals are **not** connected by this change.

Manual test command for the school code: `node --test tests/school-crm-bridge.test.mjs`.
The full school release build and browser tests should also be run before approving a merge.
