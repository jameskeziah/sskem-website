# SSKEMS Zentry-inspired hero — private photographic prototype

This is a new, **opt-in** homepage hero. It starts after the existing
1.5-second branded preloader, features a click-to-expand centre thumbnail,
and cycles through seven real SSKEMS subjects:

1. Campus (the existing design's central theme).
2. Front entrance.
3. Science experiments.
4. Skating.
5. Computer laboratory.
6. Cultural performance.
7. Sports activity.

GSAP expands the small next-photo preview into the full hero and reveals the
new live headline. Each chapter varies its diagonal geometry; navy, coral,
the admission CTA and the accessibility controls remain consistent. There is
no Three.js dependency, scroll trapping, audio, video autoplay or fake text
embedded in photographs.

## Install on your local computer

The accompanying `sskem-zentry-hero-assets.zip` is shared **separately** in
this conversation because the supplied photographs include identifiable
students and have not passed the school's publication review. They are
intentionally absent from the GitHub branch.

In PowerShell, in your website root:

```powershell
git fetch origin
git switch feature/zentry-inspired-school-hero
```

Unzip `sskem-zentry-hero-assets.zip` inside your website root. That creates
`sskem-hero-media/public/media/home/hero-drafts/`.

```powershell
New-Item -ItemType Directory -Force "public/media/home/hero-drafts" | Out-Null
Copy-Item -Force ".\sskem-hero-media\public\media\home\hero-drafts\*" "public\media\home\hero-drafts\"
$env:HOMEPAGE_REVIEW_MODE = "private"
$env:HOMEPAGE_ZENTRY_HERO = "preview"
npm run dev
```

Open the URL printed by the dev server. Scroll to the hero, hover the middle
thumbnail and click to switch. Use the seven progress buttons and arrows to
navigate. At desktop widths, the carousel also advances roughly every ten
seconds when visible and idle. It pauses on hover, focus, explicit pause,
tab inactivity, and while a transition is underway. Mobile users manually
navigate. Reduced-motion users get instant, nonblocking switches.

```powershell
npm run test:hero
npm run test:browser:zentry
```

The browser command builds a private-review version and uses Playwright.
Run lint and the full existing contract suite before merge:

```powershell
npm run lint
npm run test:contract
```

## Publication safety

**Do not enable the new hero on production yet.** Both
`HOMEPAGE_REVIEW_MODE=private` AND `HOMEPAGE_ZENTRY_HERO=preview` are
required to show this prototype. Setting `HOMEPAGE_PUBLIC_PRELOADER=true`
alone does not expose it.

The local assets are made from the original user-supplied photographs;
previously generated art-directed posters serve as visual design references,
not as rasterised buttons or headlines. The source-to-output list and SHA-256
hashes are in the ZIP's ASSET-MANIFEST.json.

Before a public launch, obtain and record rights/authenticity, guardian consent
for identifiable pupils, privacy checks, accessibility review and management
approval of **each exact file and caption**. Use the site's governed media
publication workflow, update the asset paths to approved production images,
remove the local draft-media dependency, and create a separately reviewed
public activation path. Do not simply set HOMEPAGE_REVIEW_MODE=private in
production; that would also enable unrelated private features.

The draft media directory is excluded by .gitignore to avoid accidentally
publishing student photographs through a public source repository or Vercel
preview build. Where an image is not locally available, the component
temporarily falls back to the existing campus image rather than failing.
