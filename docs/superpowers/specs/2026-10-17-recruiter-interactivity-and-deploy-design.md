# Recruiter-focused interactivity and public deployment: design

Date: 2026-10-17 · Status: built autonomously from the brief "make it more interactive so recruiters
get attached to it; deploy on Hostinger with midhunrajeev.de; deploy on GitHub". Midhun was not
available to answer questions, so every choice below is Claude's call and is open to revision.

## Intent

A recruiter lands on the page with a role in mind and a minute to spare. The site should let them
say what they are hiring for, show the evidence for that role first, and make contacting Midhun a
one-click action. Everything new must read as part of the existing "engineer's drawing" sheet, not
as a bolt-on widget.

## Goals

- A recruiter can pick a role (embedded firmware, robotics software, perception and ML, research/PhD)
  and the sheets re-issue themselves for it: pitch and evidence in the hero, relevant experience
  spans marked, projects filtered and ordered, matching skills marked, email pre-addressed.
- Key figures are visible without reading: years, projects, hardware builds, the 80% calibration cut.
- A guided "60-second tour" for people who will not scroll.
- Project cards preview their video on hover; the media viewer has previous/next and keyboard
  arrows; projects are searchable by tool or keyword.
- The hero drive gains an exploded view so the mechanism is readable.
- A vCard download and a "draft an email" button in the contact block.
- The site is reachable at https://midhunrajeev.de with HTTPS, published automatically from GitHub.

## Non-goals and anti-goals

- No new claims. All copy derives from `site/js/content.js`, the CV and existing notes; the open
  questions in `CONTENT-REVIEW.md` stay open.
- No German translation (Midhun's German is A2; a fluent German site would mislead).
- No third-party scripts, analytics or form services. The page stays self-contained.
- No scattered motion. One stamp animation on role change, one count-up on the stats, and motion
  that answers an action. Reduced-motion users get none of it.
- Do not buy anything on Hostinger. The account holds the domain but no hosting plan.

## Hosting decision

Hostinger has the domain `midhunrajeev.de` (registered 2026-10-17) but no web-hosting order, so there
is nothing on Hostinger to upload files to. GitHub Pages hosts the static `site/` folder for free with
a managed TLS certificate; Hostinger's DNS zone (managed through its API) points the apex and `www` at
GitHub Pages. If Midhun later buys Hostinger hosting, the same repository can deploy there with the
Hostinger Git integration or an FTP step; nothing in the site depends on GitHub Pages.

- Repository: `github.com/midhunr1996/midhunrajeev.de`, public, root = this folder.
- Workflow: on push to `main`, run `npm test`, then publish `site/` with the official Pages actions.
- DNS: four A records and four AAAA records on `@` pointing at GitHub Pages; `www` CNAME to
  `midhunr1996.github.io`. Hostinger's parking A record is replaced.
- Pages: custom domain `midhunrajeev.de`, HTTPS enforced once the certificate is issued.
- The laptop server and Tailscale Funnel still work for local preview; they are no longer the public
  address.

## Visual language for the new parts

The sheet metaphor supplies every new component:

- Role selection is an "Issued for" stamp. Engineering drawings carry an issue stamp; here the four
  roles are the stamp options, and the chosen one stamps the hero in the redline colour.
- Key figures are drawn as dimensions: a number with a dimension line and arrowheads under it,
  the same arrow style as the experience timeline.
- The tour is a sequence of drawing notes ("Note 2 of 6") with a leader to the element it describes.
- The exploded view is a standard drawing view, toggled from the drive readout.
- The search field is a plain rule with a label, not a boxed input.

## Behaviour details

- Role state lives in the URL as `?for=<id>` so a recruiter can share a role-specific link. Clearing
  the role restores the full sheet set.
- Role data is a pure module (`site/js/fit.js`) with tests proving every referenced project, timeline
  span and skill exists in the content.
- Search matches tokens against title, summary and tags, with spaces removed as well so "ros2" finds
  "ROS 2 Humble". It combines with the group filter and the role.
- Hover previews load the project video only on hover or focus, muted, and stop on leave. They are
  skipped under reduced motion and on save-data connections.
- The tour scrolls each stop into view, outlines it, and moves focus to the note card. Escape ends
  it. It never auto-advances.
- The exploded view animates the four assemblies apart along the shaft axis; callouts follow.

## Left to the builder

Exact spacing, the count-up duration, and the stamp angle. All new logic that has no DOM dependency
is unit-tested with `node --test`; DOM behaviour is checked in a headless browser before deploy.
