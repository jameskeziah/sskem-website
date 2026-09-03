# Programme media presentation system

## Purpose

The Programme media presentation system provides one private-review boundary
for responsive images and videos. It currently renders only the campus stills
already used by the private Programme route shells. It does not resolve or
consume production media bindings.

Implemented files:

- `lib/programmes-media.ts` defines descriptors, aspect ratios and fail-closed
  validation;
- `components/programmes/programme-media.tsx` renders the image/video figure,
  caption and private-prototype label;
- `components/programmes/programme-video-surface.tsx` handles video controls
  and reduced-motion behavior; and
- `app/data/programme-route-shells.ts` binds one existing private campus image
  to each governed route shell.

## Private-only source boundary

Every descriptor must declare `scope: "private-prototype"`. Sources must be
root-relative files under `/media/home/`; external URLs, traversal, query
strings, fragments, backslashes and `/media/home/production/` are rejected.

The private component deliberately does not import `CampusPicture` or call the
campus publication resolver. Consequently, a future production binding cannot
silently replace the prototype shown in a private Programme shell.

The current route-shell sources are:

| Route | Private prototype |
| --- | --- |
| `/school/academics` | `/media/home/campus-main.jpeg` |
| `/junior-college` | `/media/home/campus-grounds.jpeg` |
| `/programmes/jee-neet` | `/media/home/campus-entrance.jpeg` |

All three are 1400 x 500 and use the exact `panoramic` ratio.

## Aspect-ratio contract

| Token | Ratio |
| --- | --- |
| `square` | 1:1 |
| `portrait` | 4:5 |
| `landscape` | 3:2 |
| `cinema` | 16:9 |
| `panoramic` | 14:5 |

Intrinsic image or poster dimensions must match the selected ratio within a
small rounding tolerance. The component applies either `cover` or `contain`
inside that fixed ratio and never stretches the media.

## Images

An image descriptor requires:

- a stable prototype and source-record ID;
- intrinsic width and height;
- a supported private image path;
- meaningful contextual alt text;
- a visible caption;
- a responsive `sizes` expression;
- an explicit `eager` or `lazy` loading decision; and
- a supported ratio and fit mode.

The private route hero images are eager because each is the principal media in
the initial viewport. Other future image slots should default to lazy loading.
Intrinsic dimensions plus CSS aspect ratio reserve space before the image
loads.

## Videos

A video descriptor requires:

- at least one private MP4 or WebM source with a matching MIME type;
- a private poster with matching ratio and intrinsic dimensions;
- `none` or `metadata` preload behavior;
- `user-controlled` or `ambient` motion policy;
- descriptive alternative text and a visible figure caption; and
- a private WebVTT captions track when audio is present.

User-controlled video always has controls and never autoplays. Ambient video is
muted and loops, but it is not server-rendered as moving media. The client first
checks `prefers-reduced-motion`; initial, unsupported-JavaScript and reduced-
motion states retain the static poster. Changing the preference to reduced
motion removes the ambient video and returns to the poster.

No private Programme video file currently exists in the repository, so no
video is fabricated or attached to a route. The slot and validator are ready
for a future private MP4/WebM, poster and optional WebVTT set.

## Captions and alternative text

Every media item requires a visible caption. Caption detail may explain the
private-review status or prevent an unsupported inference, such as treating a
campus image as proof of a JEE/NEET operator relationship.

Alt text must be descriptive and at least twelve characters. Generic values
such as `image`, `photo`, `video`, `campus` and `school` are rejected, as are
workflow placeholders such as `TBD` and `pending approval`.

The visible figure caption does not replace video captions. Any video declared
with audio must also provide a valid local WebVTT captions track and language
label.

## Publication boundary

This system is for composition and accessibility review only. Production media
still requires the existing manifest decision, exact derivative binding,
rights/consent checks, performance audit and approved Programme package media
reference. Public route activation and deployment remain separate operations.
