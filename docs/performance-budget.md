# Performance Budget

## Core Web Vitals
- LCP target: <= 2.0s
- LCP hard limit: <= 2.5s
- CLS target: <= 0.05
- CLS hard limit: <= 0.10
- INP: <= 200ms

## Page Weight
- Initial transfer target: <= 1 MB
- Initial transfer hard limit: <= 1.5 MB
- Initial JavaScript: <= 200 KB compressed
- Initial CSS: <= 80 KB compressed

## Images
- Hero mobile: <= 250 KB
- Hero desktop: <= 400 KB
- Below-fold images: lazy-loaded
- AVIF preferred
- WebP fallback

## Video
- No autoplay hero video on mobile
- Hero video maximum: 3 MB
- Poster image required
- Never preload entire video

## Fonts
- Maximum 3 initial font files
- Initial font payload <= 150 KB
- WOFF2 only where possible

## Animation
- Animate transform and opacity
- Maximum 3–4 major concurrent animations
- Reduced-motion support mandatory
- Avoid layout-triggering animation