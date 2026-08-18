# Homepage achievement publication

The four supplied result and award creatives remain unchanged in private
review. Public rendering is fail closed and requires three independent facts
for each card:

1. the exact `pupil-media` record is current and approved;
2. the paired result or institutional claim record is current and approved; and
3. the current image bytes match one exact activation binding.

The canonical binding registry is
`content/homepage-achievement-publication-bindings.json`. It starts empty.
Never add a binding by hand and never treat a binding as approval.

## Guarded activation

After both approval records are complete, review a read-only plan:

`npm run achievements:activate -- --record media-class-x-results-2025-26`

The plan measures the existing public JPEG without modifying it, records its
SHA-256 digest, byte size, dimensions and encoded format, and checks the exact
media-to-claim pairing. It includes no source path, private evidence, consent
record or approver identity.

Only a `ready-for-explicit-write` plan may be applied with the exact
acknowledgement printed by the command. A different binding is preserved unless
`--replace` is supplied, and replacement also requires newer approval
timestamps for both the media and paired claim records. Activation writes only
the public-safe binding registry; it does not grant or refresh approval.

Run `npm run achievements:bindings:audit` after activation. The audit reopens
every bound artwork and checks its exact hash, byte count, 1400 by 500 dimensions
and JPEG encoding. The same audit runs during every build. Missing, changed,
expired, unapproved, duplicated or incorrectly paired bindings fail closed.

Private review deliberately bypasses the binding registry so reviewers can see
all four supplied originals. Public HTML omits every unbound card and omits the
entire achievement section when no card is active.
