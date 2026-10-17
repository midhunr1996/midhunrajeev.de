# Midhun Rajeev portfolio

Interactive "engineer's drawing" portfolio, published at **https://midhunrajeev.de**.

## How it is hosted

- The static site in `site/` is served by **GitHub Pages** from this repository
  (`github.com/midhunr1996/midhunrajeev.de`). Every push to `main` runs the tests and redeploys
  (`.github/workflows/deploy.yml`). Pages issues and renews the TLS certificate.
- The domain `midhunrajeev.de` is registered at **Hostinger**, whose DNS points the apex (A and AAAA)
  at GitHub Pages and `www` at `midhunr1996.github.io`. Hostinger hosts no files; if a Hostinger
  hosting plan is bought later, the same `site/` folder can be uploaded there instead.
- `site/CNAME`, `site/.nojekyll`, `site/robots.txt`, `site/sitemap.xml` and `site/404.html` are
  deployment files; `tests/site-files.test.mjs` keeps them and the canonical URL consistent.

To publish a change: edit, run `npm test`, commit, `git push`. The deployment takes about a minute.

## Local preview

`npm run serve` starts the zero-dependency server on `http://127.0.0.1:8080` (strict CSP, security
headers, byte ranges). `start-site.cmd` additionally opens a Tailscale Funnel or Cloudflare tunnel
from this laptop; that was the original public address and still works as a backup, but needs
`bin\cloudflared.exe` from github.com/cloudflare/cloudflared/releases (not committed).

## What a visitor can do

- **Hiring for:** pick a role in the hero (embedded firmware, robotics software, perception & ML,
  research/PhD). The sheet is "issued" for it: pitch and evidence appear, relevant experience spans
  and skills are marked, projects are filtered and ordered, and the draft email is addressed.
  The choice lives in the URL (`?for=embedded`), so a role-specific link can be shared.
- **60-second tour** of six stops, each a drawing note; Escape ends it.
- **Drive:** drag, scroll, arrow keys, and an exploded view of the two stages.
- **Projects:** group filters, keyword search (`/` focuses it), hover video previews, a gallery with
  previous/next, arrow keys and swipe.
- **Contact:** copy email, draft an email, download the redacted CV or a vCard.

## Edit the content

- **Text and data:** `site/js/content.js` holds the notes, timeline, projects, skills bill of
  materials, key figures and gearbox parameters. `site/js/fit.js` holds the role pitches and which
  projects, spans and skills each role marks (tests check every reference exists).
  `site/js/tour-steps.js` holds the tour notes. The hero statement and contact links are in
  `site/index.html` so they read without JavaScript.
- **Media:** `python scripts/build_media.py` rebuilds every image and video from the originals
  (paths at the top of the script; the originals are not committed).
- **CV:** `python scripts/redact_cv.py path\to\new-cv.pdf` writes a redacted copy to
  `site/assets/cv/`. It refuses to finish if a phone number, street address or birth date survives.
- **vCard:** `site/assets/Midhun-Rajeev.vcf` carries only the public contact details.

## Structure

```
site/                 everything the public can see
  index.html, 404.html, CNAME, robots.txt, sitemap.xml
  css/site.css        vellum (light) and blueprint (dark) themes
  css/features.css    role stamp, key figures, tour, search, drive controls
  js/main.js          wires everything below together
  js/content.js       all copy and data        js/fit.js        role fit data (pure)
  js/projects.js      cards, filters, dialog    js/search.js     keyword matching (pure)
  js/gearbox.js       Three.js drive            js/cycloid.js    geometry and kinematics (pure)
  js/roles.js, tour.js, tour-steps.js, stats.js, preview.js, contact.js, timeline.js, bom.js
  vendor/three.module.min.js, fonts/, assets/{img,video,cv}
server/server.mjs     local static server (GET/HEAD, traversal-safe, ranges, ETags, CSP, rate limit)
tests/                node:test suites for every pure module and the deployment files
scripts/              media build and CV redaction
docs/superpowers/specs/   design decisions
```

## Tests

`npm test` runs the server suite, the gearbox maths (proves the 144 : 1 ratio and that both discs
mesh with their pins at every angle), the role-fit and search logic, the key figures, the tour
steps, the vCard and the deployment files.
