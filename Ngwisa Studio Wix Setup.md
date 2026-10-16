# Ngwisa Studio: Wix setup

The studio is a **custom dashboard page** inside the Ngwisa Wix site. The owner and team sign in to Wix as normal, so no API keys sit in the browser.

## Build path
1. Wix CLI app (`npm create @wix/app`) → add a **Dashboard page** extension. Port `Ngwisa Studio.dc.html` into it (React).
2. Install the app on the gong gallery site. It appears in the dashboard sidebar as "Ngwisa Studio".
3. Calls use the dashboard's owner/collaborator auth through the `@wix/media`, `@wix/data`, `@wix/stores` SDKs.

## Where each screen saves
| Screen | Wix system |
|---|---|
| Library, uploads | Media Manager: `generateFileUploadUrl` → upload, folder `/Ngwisa/<folder>` |
| Alt text, consent, focus point | CMS `MediaMeta` (fileId, alt, needsConsent, consent, focalX, focalY) |
| Site map, Hero film | CMS `SiteSlots` (slotId, fileId) |
| Product photos | Wix Stores product media (reorder / add / remove) |
| New in rail | CMS `NewInRail` (productId, order) |
| Call & Answer | CMS `Pairs` (name, callProductId, answerProductId, order) |
| Appearances | CMS `Appearances` (title, type, city, year, coverId, galleryIds, body) |
| Worn by you | CMS `WornByYou` (fileId, handle, city, show) |
| Lookbook | CMS `Lookbook` (look, fileId, spots: [{x, y, productId}]) |
| Homepage copy | CMS `HomeCopy` (key, text) |
| Size guide | CMS `SizeGuide` (category, sizes, rows, note) |
| Team | Site collaborators with custom roles: Owner, Editor, Contributor |
| History | CMS `StudioVersions` (version, by, summary, snapshot JSON) |

## Draft → publish
- Every collection has a `draft` copy (e.g. `SiteSlots_draft`). The studio only writes drafts.
- **Publish** checks for blockers (missing consent, unassigned lookbook points), copies drafts to live, writes a `StudioVersions` row, then pushes Stores media order.
- **Restore** loads a snapshot into the drafts. Nothing changes live until the next publish.
- Contributors can't publish. "Send for review" notifies the owner (Wix Inbox or a triggered email).

## Site side (Ngwisa Site v19 → v20)
- Read `SiteSlots`, `HomeCopy`, `Pairs`, etc. with the visitor token already in `ngwisa-wix.js` (`/wix-data/v2/items/query`). Set collection read permission to **Anyone**.
- Hardcoded `PH`, `EVT`, pairs and copy become fallbacks only.
- Images: `static.wixstatic.com/media/<id>/v1/fill/w_<w>,h_<h>,fp_<fx>_<fy>/…` uses the saved focus point for every frame.

## Guardrails built in
- Over 20 MB for a photo, or 60 MB for a film: warning.
- Narrower than the spot needs: warning.
- No alt text: warning.
- Model or customer with no consent: **blocks publishing**.
