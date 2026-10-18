# Ngwisa Studio: Wix setup

The Studio lives at `/studio` on the Vercel site. The owner signs in with their Ngwisa site-member account. Every read and write goes through `api/studio.js`, a Vercel function that:

1. checks the member token with Wix (`/members/v1/members/my`),
2. allows only the member ids in `STUDIO_OWNER_IDS`,
3. makes the call with the site's Wix API key, limited to `Studio*` CMS collections and the Media Manager calls the Studio uses.

The browser never holds the API key, and the Studio collections stay **admin-only for writing**.

## One-time setup
1. **Wix API key.** Signed in as the site owner, open the API Keys Manager (Wix account settings → API Keys) and generate a key for the Ngwisa site with the **Wix Data** and **Media Manager** permissions.
2. **Vercel environment variables** (Project → Settings → Environment Variables, Production):
   - `WIX_API_KEY`: the key from step 1 (required).
   - `WIX_SITE_ID`: optional. Defaults to `613b5fe3-6f29-414b-80fc-abe05f934d56`.
   - `STUDIO_OWNER_IDS`: optional, comma-separated member ids. Defaults to the owner member `84062810-740a-4954-aac6-a5e0ae7f9dc2`.
3. **Redeploy** so the function picks up the variables. `GET /api/studio` returns `{"configured": true}` once the key is set.
4. **Hosting outside Vercel.** Copy `.env.example` to `.env`, fill in `WIX_API_KEY`, and run `node server.js` (Node 18+). It serves the site with the same routes as `vercel.json` and runs the Studio function. It never serves `.env`, `api/` or `server.js`. Real environment variables override `.env`. `.env` is git-ignored, so copy it to the new host by hand.
5. **Wix login domains.** Every domain that serves the site (e.g. `https://ngwisa-studio.vercel.app`) must be listed under Headless Settings → OAuth app → Allowed authorization redirect domains, or sign-in can't finish.

## Collection permissions
| Collection | Read | Write |
|---|---|---|
| `StudioHomeCopy`, `StudioSiteSlots`, `StudioNewInRail`, `StudioPairs`, `StudioAppearances`, `StudioWornByYou`, `StudioSizeGuide` | Anyone | Admin |
| `StudioVersions` | Admin | Admin |

## Where each screen saves
| Screen | Wix system |
|---|---|
| Library, uploads | Media Manager, folder `Ngwisa Studio/<folder>`. Alt text and focus point are stored as file labels (`alt:…`, `focal:x,y`). |
| Site map, Hero film | `StudioSiteSlots` (title = spot id, fileUrl, alt, focalX, focalY) |
| Site copy | `StudioHomeCopy` (title = copy key, text) |
| New in rail | `StudioNewInRail` (productId, order) |
| Call & Answer | `StudioPairs` (callProductId, answerProductId, order) |
| Appearances | `StudioAppearances` (title, type, city, year, coverUrl, gallery, body, order) |
| Worn by you | `StudioWornByYou` (fileUrl, title, city, show, order) |
| Size guide | `StudioSizeGuide` (saved, but the site does not show a size guide yet) |
| History | `StudioVersions` (version, at, by, summary, snapshot JSON with media as URLs) |

## How the site uses it
- The site reads the collections above with the visitor token in `ngwisa-wix.js`.
- Copy keys fill text across Home, Founder's Voice, Heritage, Journal/Appearances, the stories, the wall and the footer. Anything blank falls back to the wording built into the page.
- Image spots (`SPOTS` and the hero, deck and journal slots) use the published file, alt text and focus point. An empty spot falls back to the original photo.

## Publish and history
- Edits stay in the browser as a draft until **Publish**. Publish writes everything above, then adds a `StudioVersions` row. If Wix refuses the save, the draft is kept.
- Collections that failed to load are skipped on publish, so a bad load can't overwrite live content.
- **Restore** loads a saved version into the draft. Nothing changes on the site until the next publish.

## Not wired yet
- Team invites and roles are not saved. Only the members in `STUDIO_OWNER_IDS` can use the Studio.
- "Send for review" only appears in the Contributor preview and does not notify anyone.
- Product photos and Lookbook screens are not in the menu.
- Consent has no control in the Studio UI, so it does not block publishing.
