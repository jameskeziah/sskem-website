# Verified Programme public profiles

## Purpose

The profile lane publishes the small set of institutional and programme facts
explicitly approved on 9 September 2026. It does not relax or replace the frozen
Programmes publication contract. The full component-rich package remains
blocked until its required fees, eligibility, schedules, faculty, documents,
media and other evidence are complete.

## Published routes

| Route | Public scope | Evidence |
| --- | --- | --- |
| `/school/academics` | CBSE identity, Senior Secondary status, affiliation number, school code, UDISE, address, current affiliation end date and separate renewal period | `EVD-2026-001` |
| `/junior-college` | Maharashtra Board identity, Konkan division, College No., distinct UDISE, Classes XI-XII and Science | `EVD-2026-002` |
| `/programmes/jee-neet` | Shree Samarth Krupa Institute name, NEET-UG scope, PCB subjects and approved learning/test-support summary | `EVD-2026-003` |

Approval reference `APR-2026-001` applies only to the exact public profile set.
Approver identity and controlled evidence locations are not stored in the
repository.

## Deliberately withheld

- Arts and any claim that Commerce is a currently sanctioned Junior College stream;
- a Junior College recognition-order number or recognition validity;
- detailed JEE programme claims;
- eligibility rules, fee amounts, current schedules and batch timings;
- faculty names, result statistics, scholarships, documents and media; and
- a legal or billing relationship claim beyond the approved public entity name.

`25.04.028` is always labelled **College No.**, never recognition number. The
stale legacy wording `Affiliated up to 31/03/2022` is rejected by the profile
audit.

## Controls

Run:

```text
npm run programmes:profiles:audit
```

The audit checks exact routes and organisation types, current validity,
canonical metadata, opaque evidence references and every route-scoped approval
record. Missing, expired or changed approval bindings block the profile build.
The Institute profile expires after 1 December 2026 unless it is reviewed and
reapproved.

The current repository can build these profiles for authenticated review. A
site-wide public deployment remains blocked by the independent media, document,
legacy-content and remaining approval gates reported by `npm run release:audit`.
