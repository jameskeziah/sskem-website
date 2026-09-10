import Link from "next/link";

import { siteFacts } from "@/app/data/site";

export function HomepageIdentityStrip() {
  return (
    <section
      className="home-identity-strip"
      aria-label="Verified school identity"
      data-homepage-p0="identity-strip"
    >
      <div className="home-shell home-identity-strip__inner">
        <dl className="home-identity-strip__facts">
          <div>
            <dt>CBSE affiliation</dt>
            <dd>{siteFacts.affiliationNumber}</dd>
          </div>
          <div>
            <dt>Campus</dt>
            <dd>Veral · Khed · Ratnagiri</dd>
          </div>
        </dl>
        <Link href="/mandatory-public-disclosure">
          <span>Public information</span>
          <strong>Mandatory Public Disclosure</strong>
          <i aria-hidden="true">↗</i>
        </Link>
      </div>
    </section>
  );
}
