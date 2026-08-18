# Homepage poster optimization

This workflow measures and prepares a lossless review candidate for the approved
homepage/social poster without changing its composition, pixels, public file,
approval state or performance budget.

## Verified current result

`public/og.png` is a 1200 × 630 PNG. The exact-composition lossless profile
reduces it from 1,446,077 bytes to 1,004,872 bytes while preserving the decoded
RGBA pixels exactly and removing EXIF, XMP and IPTC metadata.

The candidate is still 604,872 bytes above the 400,000-byte public-release
ceiling. This means lossless PNG compression alone cannot close the blocker.
The release budget remains unchanged and the public build must remain blocked.

## Commands

```powershell
npm run poster:inspect
npm run poster:prepare
npm run poster:decision-request
npm run poster:decision-plan -- --request "CONTROLLED_REQUEST_PATH"
npm run poster:decision-record -- --request "CONTROLLED_REQUEST_PATH"
```

`poster:inspect` is read-only. `poster:prepare` writes only to the ignored
`work/homepage-poster-optimization/` directory:

- `og.lossless.png` — the pixel-identical review candidate.
- `optimization-receipt.json` — hashes, dimensions, byte comparison, metadata
  checks and the explicit decision state. It contains no local source path,
  approver identity or private evidence reference.

Preparation refuses to replace a non-empty staging directory. After reviewing
the exact target, an intentional refresh can use:

```powershell
npm run poster:prepare -- --replace
```

No command in this workflow writes to `public/og.png`, changes
`content/homepage-media-performance-budget.json`, activates a candidate or marks
it approved.

`poster:decision-request` prints an unfilled JSON packet bound to the exact
source hash, lossless result, performance ceiling and current poster approval
record. The same packet is available to authenticated private reviewers from
the publication dashboard. It offers four explicit scopes—hold the PNG, review
lossless formats, review controlled encoding, or commission a separate artwork
revision brief—but preselects none of them and generates no candidate.

Authenticated management reviewers can instead use
`/publication-review/poster-delivery-decision-workspace`. The HTML form
preselects no scope, requires the four canonical acknowledgements, accepts only
opaque controlled-record references and a lowercase role identifier, and uses
the browser completion time as `approvedAt`. The browser validates the current
template and downloads the completed request without submitting the decision
fields to a server. The guarded local planner remains the authoritative digest
check before recording; the worksheet performs no persistence or repository write.

Keep the completed request and private evidence in the school-controlled
system. The repository and download contain only the empty request template,
public-safe hashes and opaque evidence-reference fields.

The completed-request schema is
`content/homepage-poster-delivery-decision-request.schema.json`. The plan command
checks both exact digests, one canonical option, all four explicit
acknowledgements, unique opaque evidence references, a role identifier and a
non-future approval timestamp. It returns a privacy-safe projection of the
selected authority without echoing evidence references.

The planner has no apply mode. It cannot record the decision, modify the
manifest, generate a candidate, alter the source, raise the budget or publish.
Its `ready-for-controlled-recording` status means only that the completed
request is internally consistent and may be retained by the controlled system.

The decision-binding registry at
`content/homepage-poster-delivery-decision-bindings.json` starts empty. The
`poster:decision-record` command is also plan-only by default. It proposes one
binding containing the exact contract, approval-record and completed-request
hashes; the selected scope; one opaque decision reference; the approving role;
and timestamps. It never copies the completed request or supporting evidence.

An explicit apply flag and the command's exact local-write acknowledgement are
required to record a first binding. A different binding is refused unless the
operator also supplies `--replace` after reviewing the new completed request.
Recording a binding authorizes only that private review scope: it does not
generate a candidate, change the source or budget, update the publication
manifest, or grant publication approval. The current canonical registry remains
empty until such an independently approved request exists.

## Decision boundary

Meeting the current byte ceiling now requires at least one new art-direction
decision: allow a different delivery format, allow pixel-level encoding changes,
or revise the artwork/placement. Each option changes an approved constraint and
therefore needs separate management approval before implementation. Do not
silently raise the performance budget or substitute the staged file into public
output.

Once a decision packet is completed and retained in the controlled system, the
next implementation should add only the selected
format-specific, quality-reviewed derivative contract and bind it through the
existing publication and performance gates.
