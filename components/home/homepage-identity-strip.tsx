
import Link from "next/link";

import { siteFacts } from "@/app/data/site";

export function HomepageIdentityStrip() {
  return (
    <section
      className="home-identity-strip home-identity-strip--hybrid"
      aria-label="Verified school identity"
      data-homepage-p0="identity-strip"
    >
      <div className="home-shell home-identity-strip__inner">
        <dl className="home-identity-strip__facts">

          {/* Affiliation information */}
          <div
            className="home-identity-strip__fact"
            data-foundation-identity-reveal
          >
            <dt>CBSE affiliation</dt>
            <dd>{siteFacts.affiliationNumber}</dd>
          </div>

          {/* Location information */}
          <div
            className="home-identity-strip__fact"
            data-foundation-identity-reveal
          >
            <dt>Campus</dt>
            <dd>Veral · Khed · Ratnagiri</dd>
          </div>

        </dl>

        {/* Public disclosure */}
        <Link
          href="/mandatory-public-disclosure"
          className="home-identity-strip__disclosure"
          data-foundation-identity-reveal
        >
          <span>Public information</span>

          <strong>
            Mandatory Public Disclosure
          </strong>

          <i aria-hidden="true">↗</i>
          <small
            className="home-identity-strip__easter-egg"
            aria-hidden="true"
            > ✦ Psst... curiosity starts here.
          </small>
        </Link>
      </div>
    </section>
  );
}
