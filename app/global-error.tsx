"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main-content" className="site-state-page site-state-page--global">
          <section className="site-state-card site-state-card--error" role="alert" aria-labelledby="global-error-title">
            <p className="eyebrow">Website unavailable</p>
            <h1 id="global-error-title">The website could not finish loading.</h1>
            <p>Try once more. If the problem continues, return to the homepage later.</p>
            <div className="site-state-actions">
              <button className="button button--primary" type="button" onClick={reset}>Try again</button>
              <Link className="button button--secondary" href="/">Return home</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
