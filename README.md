# CON — Things, Ideas & Projects

An independent project archive at `con.fail`. The site uses the existing static
Vercel project: `public/` is the output directory; no framework or build is needed.

## Local preview

```sh
python3 -m http.server 8771 --bind 127.0.0.1 --directory public
```

Open http://127.0.0.1:8771/.

A large bilingual introduction appears on every page entry, using the supplied
CON statement, centered directly over the canvas without a backdrop. It remains
for ten visible seconds and fades out; time in a background tab does not consume
the reading time. The canvas moves and stays interactive from the first frame.
Clicking anywhere or pressing Escape dismisses the text immediately.
The About control reopens this introduction with a fresh ten-second timer.
It also works over Ideas and Projects, with contrasting text and without
overlapping the project-title list. Reopening during a fade cancels that fade's
pending hide callback.
The clock's city label is abbreviated to JLM in both languages.
Navigation and language controls share one font size at every breakpoint
(10.5px desktop, 9px small screens, 8.5px phones) and the same underline offset.
A line-height SVG arrow between HE and EN rotates toward the selected language.

The pointer drives the continuous canvas, gently near the center and faster at
the edges. Hovering a work keeps the canvas moving and shows its title at the
pointer. Hovering the navigation slows the canvas to rest with a short exponential
ease; leaving it smoothly resumes movement. Things preserves product
proportions and a consistent display scale.
Animated covers, including Future Postcards, play their original GIF directly
on the Things canvas instead of displaying a still thumbnail.
The Things canvas matches the photography's `#F7F5F6` background. MENORA and
CONTAINERS use wider photographs with complete leftward cast shadows. Their
expanded floor space is part of each photograph, without opacity masks or edge
fades. The layout reserves the extra image width and compensates for the framing
to keep the products at their former display scale. In the open project gallery,
these two covers use a 3:4 crop centered on the object; the extended shadow may
be clipped. The canvas retains the full wide image. Their opening and closing
transitions animate the crop window and photograph separately, preserving the
object's proportions throughout. The source archive remains untouched.
The 0.8px SVG reticle is used throughout the site, including navigation, Projects
and native dialogs. Its white layer uses difference blending to stay light on
dark media and dark on light surfaces, with no outline or drop shadow.
The title bubble stays in a separate, normally blended layer.
At the boundary and outside a modal, the reticle uses a solid dark color over the
light backdrop (white over Ideas' black backdrop), avoiding the transparent
top-layer blend that previously split it into black and white halves.
Hover contracts the ring and moves the four ticks inward,
shortening them from 11 to 8px while keeping stroke and dot size fixed.
Dragging, trackpad scrolling and arrow keys also move the canvas; Tab reaches
every project. The pause control and reduced-motion preference disable automatic
movement. On touch devices, drag to explore.
Things uses aligned rows and columns with photographs about 20% larger than
the original layout. Its repeating 6 × 5 grid fills every cell: SIGNETURE appears
again on the opposite side so the 29 originals do not leave an empty 30th slot.
Minimal − / + controls beside the language switch scale the
whole grid from 80% to 130%, without a visible percentage or control container.
The initial scale is 80%. The + / − keys adjust it, and 0 resets to 80%.
Zoom eases around the viewport
center and keeps image proportions, spacing and the camera position intact.
The bottom-center SVG clock follows `Asia/Jerusalem`, including daylight-saving
changes, beside Jerusalem's current temperature in Celsius from Open-Meteo.
Weather refreshes every 15 minutes and uses a session cache; readings older than
an hour are replaced with a dash if the service is unavailable. The temperature
links to its source. The rotating symbol matches the wordmark's rendered height.

Each project opens in a native modal dialog with an image transition, a photograph
gallery, its original object description, and the original project narrative and
images. Shared-image transitions measure the resting dialog layout, reserve the
image's aspect ratio and scrollbar space, and animate only the image transform.
Product photographs start at the top, with gallery controls and thumbnails
underneath. Their size is bounded by the photo column and viewport height.
They align with “The idea” only when its natural position is within 15% of the
desired image height; neither text nor image receives extra spacing to force
that alignment. Below 961px, product photos and descriptions stack into one
column. Project content loads before the opening transition is measured, so the
image does not jump when its description arrives.
Closing fades the container, its shadow and the backdrop together with the
image's return (420ms, or 280ms without an image return). An early close takes
the current opening frame as its starting point, and the dialog leaves the
top layer before the completed animations are reset.
Escape, the close button or the backdrop returns to the same canvas
position. Things presents the 29 original objects. Ideas contains 99 visually
reviewed inspiration, process and documentary photographs and videos,
including eight YouTube links and ten silent local video loops. Standalone
illustrations, logos, scans, graphic layouts, product catalogue shots and product
close-ups are excluded from this selection.
Opening a fragment shows that media with a link into its complete project story.

Ideas has a black background and a real CSS 3D scene using the same inside-the-
sphere camera model as the personal website's Vault entrance. The camera stays
at the center; fixed tangent image planes cover the whole sphere in an equal-area
arrangement. Its radius is 3000 units, with a longer 38° lens (42° on mobile)
for a broad, gentler curvature and 320ms velocity smoothing.
A single parent rotates in 3D. Images never move or resize
independently during rotation, and a full turn returns to the original arrangement.
Native perspective projects real DOM buttons, retaining mouse, touch and keyboard
interactions. Disjoint angular cones around the planes preserve at least 36px
between projected polygons on tested desktop sizes and 22px on narrow/short screens.
All fragments have a black presentation matte. Near-black slide and studio
backgrounds are keyed to black at display time; original RGB artwork and files
are retained. Full-bleed photographs get a black frame, preserving the
whole photograph. `python3 scripts/idea_mattes.py` re-audits these classifications.
The hand illustration and both standalone Sale artwork variants are excluded
from Ideas and project stories. `scripts/excluded-media.json` also keeps them out
of subsequent imports; the source archive remains unchanged.

Projects presents five centered titles: Dan Reisinger Letters, Otef, Dressed to
Protest, Dudu Geva Was Here and Buy Bye (שלם שלום), with Hebrew names in Hebrew mode.
Pointer hover and keyboard focus reveal the corresponding
background image. Clicking opens the full project with its descriptions, media
and credits. Each canvas remembers its position when switching views.
Section changes fade out over 180ms and in over 360ms, with a background-color
transition. Repeated navigation cancels the previous fade safely; reduced motion
switches immediately. Idea dialogs fit their media and caption instead of taking
the full project height, and remain scrollable on small screens.

Video posters show a play control that expands to “Play video” on hover or
keyboard focus, and remains expanded on touch devices. It opens the original
YouTube video in a new tab, keeping the project and its scroll position in place.
Ideas uses 56px play badges on the sphere and 88px play controls with 40px
icons in the open idea, doubling their original dimensions.
Local films play automatically, muted and looping, without player controls.
Their display uses the video's original aspect ratio, without added letterboxing.
Only visible films play; scrolling away, hiding the tab or closing a project pauses them.
Editorial projects use compact “Visit … website” links to Reisinger Letters,
Otef and Haachim Group in place of the “The idea” button;
Dressed to Protest has no extra button.
The project has no gradient overlays at either edge.

At the end of a project, an intentional upward pull reveals a closing control.
The first part reveals the whole button; only then does its background fill.
Trackpad input uses a short 72px reveal plus 108px fill and closes immediately
when full, without a hold or release delay. A renewed push is recognized across
160ms of samples, including gradually increasing pressure after decaying momentum.
The stable shell captures the gesture over the revealed gap, button and videos.
Touch uses a longer 260px reveal
plus 540px fill and closes on release. Ordinary scrolling into the end and its
momentum cannot close the project. Light or reversed pulls retract; Escape and
the close button remain available.

## Phone tilt

On supported phones, the `TILT` / `הטיה` control enables motion steering for
Things and Ideas. It requests DeviceOrientation permission directly from the tap
where required; it never asks on page load. Use HTTPS (`https://con.fail`) on a
phone. Unsupported devices and denied/unavailable sensors retain touch dragging.

The first valid orientation calibrates the holding position. Relative rotation
matrices avoid Euler-angle wrap jumps, a 1.5° neutral zone suppresses hand tremor,
and steering reaches full strength at 18°. Screen rotation recalibrates and maps
the axes to the current orientation. Velocity eases over 220ms with a lower cap
than desktop pointer steering. Touch dragging takes priority, project dialogs
pause movement, and returning from either recalibrates to the current grip.
Background tabs stop movement and recalibrate on return. The existing pause
control still works; changing the OS reduced-motion preference disables tilt.
Tapping TILT again turns it off. No sensor readings are saved or transmitted.

The tests cover direction, upright grips, wrap, screen rotation, permission
grant/denial, missing sensors, cancellation and backgrounding. Desktop browser
checks cover layout and the unavailable-sensor fallback; physical iPhone/Android
sensor feel requires a real handset check.

API references: [DeviceOrientation permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)
and [orientation coordinate model](https://w3c.github.io/deviceorientation/#model).

## Content

- `public/data/index.json`: lightweight canvas metadata and cover images.
- `public/data/<id>.json`: complete project descriptions and ordered content.
- `public/data/ideas.json`: source fragments and their owning projects.
- `public/data/projects.json`, `public/data/projects/*.json`: the five editorial
  presentations, complete media and credits.
- `public/data/locales.json`: translated titles, descriptions, narratives and
  credits. Text translations are keyed by the original block's trimmed text;
  update the matching translation when changing source copy.
- `public/i18n.mjs`: interface translations and locale selection. The HE / EN
  switch sits at the bottom left on desktop and stays usable in open projects.
  The preference persists locally. English is the default; Hebrew sets `lang=he`
  and `dir=rtl`. Switching updates text without replacing playing video or
  changing the selected photograph. Media and original source data are retained.
- `public/media/`: optimized project images; animated GIFs remain animated.
- `public/assets/`: the existing ABC Favorit font and supplied CON SVG artwork.
  Typography enables the font's `ss08` (Alt Alef) feature throughout the site.
- `scripts/source-video-links.json`: source-verified YouTube poster mappings,
  recovered from all 29 Squarespace project previews. Twelve video placements
  across five projects point to eight unique videos; all eight were available
  through YouTube's metadata endpoint on 2026-10-20.

No prices, availability, cart or checkout are included. References to commerce
within the artworks and their original explanatory texts are preserved.

The source archive is stored separately at
`/Users/neilcohen/Documents/CON/squarespace-export-2026-10-20`.
Original files and source snapshots are not served by this website.

To regenerate the optimized files from that archive (requires Python + Pillow):

```sh
python3 scripts/import-archive.py /path/to/squarespace-export
```

This regenerates the JSON content, so preserve any editorial metadata changes
before reimporting. Six JDW projects have a confirmed release year of 2024 in their
original texts. Other release years remain null pending confirmation.
Two Menora videos have preserved references in the private source archive but
were unavailable to download; they are not presented as playable videos.

The additional projects were imported from the local personal-website and
Dudu Geva repositories. Reisinger (2024), Otef (2023), and Dressed to Protest
(2023) use those source projects' dates. Dudu Geva has no date assigned.
Buy Bye (2024) includes all 27 photographs from the portfolio gallery and bilingual
copy adapted to CON's voice. Import it independently with:

```sh
python3 scripts/import-buy-bye.py /path/to/personal-website
```

To regenerate those presentations and Ideas (Python + Pillow, and FFmpeg):

```sh
FFMPEG_PATH=/path/to/ffmpeg python3 scripts/prepare-views.py \
  /path/to/personal-website /path/to/dudu-geva-site
```

The script creates optimized images, silent canvas previews, and complete
web-ready videos. It does not change the source repositories.
To rebuild only Ideas, run `python3 scripts/build_ideas.py`. Its reviewed
allowlist is `scripts/ideas-selection.json`; new source media is not included
until it has been classified as photography or video.

## Verification

The original 29 descriptions and project text were verified against the archive.
All 949 local media references in the content data resolve. Browser checks cover the three
views, editorial project loading, media playback, Ideas-to-project navigation,
restored focus, and 390px and desktop layouts.

The sphere and end-scroll gesture are covered by:

```sh
node --test scripts/*.test.mjs
```

These checks cover the curated photo/video selection, rigid 3D rotation, complete revolutions,
access to every fragment, image polygon gutters through 960 camera positions
at six viewport sizes, momentum protection, deliberate pulls, cancellation, and
the touch threshold. Native browser wheel input also verified the reveal, armed
state, release-to-close, and focus restoration.
Localization checks cover all 34 objects/projects, original media and link
preservation, English Dudu Geva copy, and repeated language changes.
