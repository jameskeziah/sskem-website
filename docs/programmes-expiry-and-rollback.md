# Programme expiry and rollback controls

## Status

The expiry projection, guarded presentation components, strict receipt schema
and read-only rollback planner are implemented. They do not publish, activate,
write a registry entry or deploy a Programme route. The three routes remain in
private review and outside public navigation and the sitemap.

## What expires

The adapter carries a `validUntil` date for each time-sensitive presentation
unit. The date is the earliest applicable end date from the approved package,
its referenced evidence, its referenced claims and each claim's approval-
manifest record:

| Section | Expiry inputs | Expired behavior |
| --- | --- | --- |
| Fees | package, fee evidence, financial claims and manifest decisions | Remove every fee value and show the canonical fee-information fallback. |
| Schedule | package and schedule evidence | Remove the schedule summary and entries and show the canonical schedule fallback. |
| Results | package, result evidence, performance claims and manifest decisions | Remove the complete results group when any displayed result reaches the earliest end date; never leave a partial result set. |
| Admissions | package and admissions evidence | Remove the admissions summary and actions and show the canonical admissions fallback. |

An end date is inclusive through that UTC calendar date. For example, content
with `validUntil: 2027-05-31` remains current at
`2027-05-31T23:59:59.999Z` and expires at
`2027-06-01T00:00:00.000Z`. An invalid or unavailable section window fails to
the same safe fallback.

The base publication contract remains authoritative. An expired or rejected
package cannot be newly adapted, and this layer cannot revive it. In a future
active implementation, the expiry resolver must run on every request or on a
cache whose revalidation cannot extend beyond the nearest expiry. The public
route resolver must also keep enforcing the package-level approval boundary.

## Safe fallback boundary

`resolveProgrammeExpiryProjection` accepts only a page object issued by the
approved Programme adapter. Its expired decisions contain:

```text
state: fallback
content: null
fallback: canonical contact guidance
```

The previous fee, schedule, result or admission values are not carried into the
renderable fallback projection or receipt. All four canonical fallbacks point
to `/contact`; they contain no amount, timetable, result claim, deadline or
unapproved replacement fact.

The presentation layer exposes four independently placeable components:

- `ProgrammeExpiringFeeSummary`
- `ProgrammeExpiringSchedule`
- `ProgrammeExpiringResults`
- `ProgrammeExpiringAdmissionsCta`

Each requires both the exact opaque route gate and the exact in-process expiry
projection. A copied or reconstructed projection has no render authority.
`not-applicable` sections render nothing. Current sections use the existing
approved Programme component; expired sections use only the canonical fallback.

## Receipt

Every projection creates a receipt conforming to
`content/programmes-expiry-receipt.schema.json`. It binds:

- route, package and route digests;
- the complete source projection digest;
- the safe projected-output digest;
- all four section states, reasons, end dates and canonical fallback IDs;
- the exact preceding receipt/projection/package/route digests when a rollback
  target was supplied; and
- controls confirming that no expired content, repository write or deployment
  is part of the operation.

The receipt has its own SHA-256 over its exact canonical contents. It is an
integrity and audit artifact, not a publication authorization. The approved
projection bundle that matches its source digest must remain in the controlled
release system; the repository must not store real evidence or private source
material.

## Rollback rule

The active receipt may retain one exact predecessor as `rollbackTarget`.
`planProgrammeExpiryRollback` returns `ready-for-explicit-rollback` only when:

1. both receipts are structurally valid and their receipt digests match;
2. both belong to the same route;
3. the target exactly matches all four digests retained by the active receipt;
4. the target was not generated in the future; and
5. every `current` section in the target remains current at rollback time.

A stale fee, schedule, result or admissions section blocks the whole rollback.
The planner never writes the active pointer, restores content or deploys. A
future activation service must additionally require the exact retained approved
projection bundle and produce its own atomic activation/rollback receipt.

## Read-only commands

Plan current section states and emit receipts to standard output:

```text
npm run programmes:expiry:plan -- <approved-package.json> --now=<ISO-date-time>
```

For a controlled simulation using an exact package projection that was
validated earlier, provide the original validation time separately. This is
non-authorizing and cannot be used as a production approval bypass:

```text
npm run programmes:expiry:plan -- <approved-package.json> --source-validated-at=<ISO-date-time> --now=<ISO-date-time>
```

Chain a prior plan's receipts into the next receipt set:

```text
npm run programmes:expiry:plan -- <approved-package.json> --previous-receipts=<prior-expiry-plan.json> --now=<ISO-date-time>
```

Check a proposed rollback without changing anything:

```text
npm run programmes:expiry:rollback-plan -- --active=<active-plan.json> --target=<target-plan.json> --route=/programmes/jee-neet --now=<ISO-date-time>
```

## Remaining operational integration

After management-approved versioned data exists:

1. wire the four guarded expiry components into the approved route renderer;
2. ensure request/cache revalidation runs before the earliest section end date;
3. retain the exact projection bundle and receipts in the controlled release
   store;
4. add an atomic active-pointer update that emits a separate activation receipt;
5. test automatic expiry and rollback in a private production-like environment;
6. rerun accessibility, performance, media, document and release gates; and
7. activate/deploy only with separate authorization.
