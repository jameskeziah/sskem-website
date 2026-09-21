# Headless WordPress transition

Status: discovery connection complete; public consumption disabled.

The public frontend remains the existing Next.js/vinext application. WordPress
is being evaluated only as a staff-facing content source. This work does not
turn the frontend into a WordPress theme and does not change the live
installation, hosting, DNS, navigation, sitemap or public output.

## Current boundary

```text
WordPress public REST API
        |
        | server-only GET, no credentials
        v
sanitized review candidates + exact SHA-256 fingerprints
        |
        | approval and binding required
        v
no public consumer yet
```

`lib/cms/wordpress-rest.server.ts` is the only WordPress discovery boundary.
It accepts only the current `www.sskemschool.com` origin or the future
`cms.sskemschool.com` origin, requests bounded public fields, rejects redirects
and non-JSON responses, strips HTML and shortcodes, and never returns a public
eligible record.

Setting `WORDPRESS_CMS_ORIGIN` only enables a read-only inventory. It must never
act as a public CMS-source switch.

## Reproducible audit

```powershell
npm.cmd run cms:wordpress:audit -- --origin=https://www.sskemschool.com
```

The live check on 19 September 2026 reported:

- 47 published pages;
- 18 published posts;
- 1,058 media records reported by WordPress;
- the newest 100 media records inspected in the bounded discovery request;
- 165 sanitized review candidates;
- zero candidates accepted for public publication.

The media request is deliberately a recent bounded sample, not a claim that all
1,058 media records have passed review.

## Content findings

- 42 of 47 pages contain unresolved WPBakery shortcodes.
- The existing posts are demo, empty or otherwise unsuitable for automatic news
  publication.
- Publicly retrievable images have no usable alt text or captions.
- Gallery HTML contains scripts and must not be rendered directly.
- PDFs remain controlled documents, not ordinary WordPress media.
- Identity, regulatory, admissions, programme, results, contact and pupil media
  content must continue through the existing approval pipelines.

Raw WordPress HTML must never be passed to `dangerouslySetInnerHTML`. The current
corpus is migration source material, not page-ready content.

## Chronological rollout

1. **Discovery — complete.** Keep the adapter read-only and confirm live public
   pages, posts and media without credentials.
2. **Exact source registry — next.** Bind one deliberately selected WordPress
   item by content type, ID, slug, `modified_gmt`, sanitized fingerprint,
   approval records, placement and validity window.
3. **Private editorial adapter.** Normalize only that bound item to the existing
   homepage editorial contract and show it in authenticated, `noindex` review.
4. **Temporary frontend deployment.** Verify the complete new design at its
   temporary Cloudflare/Sites address while the current WordPress site stays
   online.
5. **Controlled migration.** Add approved pages or structured WordPress fields
   one content type at a time. Media and documents retain their dedicated gates.
6. **CMS relocation and DNS cutover.** Only after private acceptance, move the
   WordPress installation to `cms.sskemschool.com`, verify admin and REST access,
   and then point the public domain to the new frontend with a tested rollback.
7. **Sanity retirement.** Remove the Sanity path only after the WordPress path is
   stable and every required public content type has a verified replacement.

The smallest safe next implementation is one new, approved announcement. The
current 18 legacy posts and the complete media library must not be imported or
published automatically.
