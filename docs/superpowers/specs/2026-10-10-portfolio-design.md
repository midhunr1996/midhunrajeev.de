# Midhun Rajeev portfolio: design spec

Date: 2026-10-10 · Status: approved in chat ("yes build")

## Goal
An interactive personal website for Midhun Rajeev (Robotics & Embedded Systems Engineer) built from his CV,
projects document, LinkedIn media and GitHub. Served from his Windows laptop, reachable worldwide.

Audience: recruiters, robotics research groups and potential PhD supervisors.
Success: a visitor knows who he is within ~30 s, explores projects, and can contact him.

## Decisions (from the user)
- Visual concept: "Engineer's Blueprint + 3D".
- Public access: Cloudflare Quick Tunnel (random `*.trycloudflare.com` URL, changes on restart).
- Public contact: email, LinkedIn, GitHub, downloadable CV (redacted: no address, phone, date of birth).
- Projects: all four groups (robotics & embedded, AI & vision, mechanical & simulation, apps & web).

## Privacy rules
Never publish: home address, phone, date of birth, nationality, or any ID/visa/financial document.
Text comes only from his own documents; inferred project details are flagged in `CONTENT-REVIEW.md`.

## Architecture
```
portfolio/
  site/            static files only (the only folder the server can read)
    index.html, css/, js/, vendor/three.module.min.js, fonts/, assets/{img,video,cv}
  server/server.mjs   zero-dependency Node static server, binds 127.0.0.1
  server/server.test.mjs  node:test suite
  bin/cloudflared.exe     Quick Tunnel client (downloaded, not installed)
  start-site.ps1 / start-site.cmd   starts server + tunnel, prints public URL
```

### Server contract
- GET/HEAD only (405 + `Allow` otherwise); malformed URI → 400; null byte → 400.
- Resolves inside `site/` only; traversal, hidden dot-files and directories without index → 404, never a listing.
- Single byte-range support (206/416) so videos play on Safari/iOS.
- ETag + 304; `no-cache` for HTML, 1-day cache for assets.
- Security headers: strict CSP (no inline script, no third-party origins), nosniff, referrer policy,
  permissions policy, COOP, frame-ancestors none.
- In-memory per-client rate limit (default 600 req/min) → 429. Access log without IPs.

### Site
- Hero: procedurally generated cycloidal drive (Three.js, edge-line render) from the real design parameters;
  pointer drag rotates, page scroll turns the input shaft; live input/output/ratio readout.
  Fallback SVG drawing without WebGL; no auto-motion under `prefers-reduced-motion`.
- Sheets: About (dimensioned stats), Experience (timeline as dimension line), Projects (filterable by group,
  detail dialog with media + links), Skills as Bill of Materials (hover cross-highlights projects), Contact.
- Light "drafting paper" and dark "blueprint" themes, toggle remembered per visitor (localStorage, guarded).
- Responsive to 360 px, visible keyboard focus, semantic landmarks, dialog is keyboard accessible.
- Media: videos re-encoded H.264 ≤ 720p with posters and `preload="none"`; images resized to WebP.

## Testing
- `node --test server/` covers routing, MIME, traversal, headers, range, ETag, rate limit.
- Browser check at 1440 px and 390 px: no console errors, no horizontal scroll, 3D renders, dialog works.
- `curl` the public tunnel URL to prove external reachability.
