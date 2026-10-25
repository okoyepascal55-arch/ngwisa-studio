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
   - `SITE_URL`: recommended once the domain is live, e.g. `https://ngwisa.com`. Used for canonical links, the sitemap and share previews. Without it the address the request came in on is used.
3. **Redeploy** so the function picks up the variables. `GET /api/studio` returns `{"configured": true}` once the key is set.
4. **Hosting outside Vercel.** Copy `.env.example` to `.env`, fill in `WIX_API_KEY`, run `npm install`, `npm run build`, then `node server.js` (Node 18+). It serves the site with the same routes as `vercel.json` and runs the Studio function. It never serves `.env`, `api/` or `server.js`. Real environment variables override `.env`. `.env` is git-ignored, so copy it to the new host by hand.
5. **Wix domains.** Every domain that serves the site (e.g. `https://ngwisa-studio.vercel.app` and the live domain) must be listed under Headless Settings → OAuth app → Allowed authorization redirect domains. Sign-in can't finish otherwise, and Wix checkout won't send shoppers back to `/thank-you` or to the page they left from.
6. **The `StudioProducts` collection** (Wix CMS, created 19 Oct 2026), permissions as in the table below, with these fields: `title` (text, the Wix product name), `productId` (text), `slug` (text), `seedId` (text), `hidden` (boolean), `displayName` (text), `category` (text), `gender` (text), `hook` (text), `best` (number), `restock` (boolean), `seoTitle` (text), `seoDescription` (text), `order` (number). Then open Studio › Products and publish once (see below).
7. **Product URLs and search.** Each piece lives at `/shop/<slug>`, using the URL slug from Wix Stores (product → SEO settings). Changing a slug in Wix changes the address. Submit `https://<your domain>/sitemap.xml` in Google Search Console.

8. **Hosting on Wix.** The site is served from Wix (see README › Hosting on Wix); the Studio at `/studio.html` saves through `https://ngwisa-studio.vercel.app/api/studio`. That function only answers the origins in `STUDIO_ORIGINS` (default: the `wix-site-host.com` address). Add the custom domain there, comma-separated, when one is connected.

## Collection permissions
| Collection | Read | Write |
|---|---|---|
| `StudioHomeCopy`, `StudioSiteSlots`, `StudioNewInRail`, `StudioPairs`, `StudioAppearances`, `StudioWornByYou`, `StudioSizeGuide` | Anyone | Admin |
| `StudioProducts` | Anyone | Admin |
| `StudioVersions` | Admin | Admin |

## Where each screen saves
| Screen | Wix system |
|---|---|
| Library, uploads | Media Manager, folder `Ngwisa Studio/<folder>`. Alt text and focus point are stored as file labels (`alt:…`, `focal:x,y`). |
| Photo spots on every page | `StudioSiteSlots` (title = spot id, fileUrl, alt, focalX, focalY) |
| Words on every page | `StudioHomeCopy` (title = copy key, text) |
| New in rail | `StudioNewInRail` (productId, order) |
| Call & Answer | `StudioPairs` (callProductId, answerProductId, order) |
| Appearances | `StudioAppearances` (title, type, city, year, coverUrl, gallery, body, order) |
| Home › The Wall | `StudioWornByYou`, one row per tile: kind (`PHOTO`, `REEL`, `QUOTE`, `TAG`, `FILM`), col (0–2), order, frames (photo URLs), fileUrl (first photo), productId (linked piece), text and kicker (quotes), wide (landscape photo), handle and city (credit), show. Rows saved before the wall editor (photos only) still fill the design's photo tiles in order. |
| Best sellers (Home rack, Shop) | `StudioProducts.best` (1–4 on the rack and atop the shop; 0 = not ranked; blank = the design's own rank) |
| Products | `StudioProducts` (one row per Wix product: shown or hidden, name on the site, category, who it's for, hook, best-seller rank, restocking, search title and description, link to the design's built-in piece) |
| Size guide | `StudioSizeGuide` (opens from "Size guide →" on every product page, in cm or inches) |
| Search & sharing (each page) | `StudioHomeCopy` (`seo<Page>T`, `seo<Page>D`) |
| History | `StudioVersions` (version, at, by, summary, snapshot JSON with media as URLs) |

## The shop and Wix Stores
- Wix Stores is the catalogue: the site lists every visible Wix product that Studio › Shop › All pieces doesn’t hide, with its Wix price, photos, description, sizes and stock. Stock for every piece comes from one inventory query; a piece's sizes load when it is opened.
- **First publish of Products.** Until `StudioProducts` has rows, the shop shows only the pieces it showed before (the old fixed list), so nothing changes on deploy. The All pieces screen starts with those pieces marked Shown and the rest Hidden; publishing once makes the screen the source of truth. From then on a piece added in Wix shows on the site by itself (and is flagged "New in Wix" in the Studio).
- Pieces in the design that aren't in Wix (e.g. Mita Set, Gong Waistcoat) stay on the site as "price on request". Add a Wix product with the same name to sell one online; the Studio links them by name, or by the saved link once published.
- Checkout is Wix's hosted checkout. Paid orders return to `/thank-you`, which shows the order to signed-in members and a confirmation note to guests.

## How the site uses it
- The site reads the collections above with the visitor token in `ngwisa-wix.js`.
- Copy keys fill text across Home, Founder's Voice, Heritage, Journal/Appearances, the stories, the wall and the footer. Anything blank falls back to the wording built into the page.
- Image spots (`SPOTS` and the hero, deck and journal slots) use the published file, alt text and focus point. An empty spot falls back to the original photo.
- `api/page.js` reads the same collections (and Wix Stores) on the server, so each address is served with its own title, description, share image and structured data. It caches for 5 minutes, so a publish shows in search previews within about 5 minutes. If Wix is unreachable the page still loads with its built-in titles.

## Publish and history
- After Publish the Studio reads every area back the way the public site does and says “LIVE ON THE SITE NOW · CHECKED”, or names what the site doesn’t show yet.
- The site reads Studio content live from Wix on every page load (and again when an open tab comes back into view), so a publish shows straight away. Page titles and descriptions update in the open page straight away; the tags in the built page files (what chat apps read for link previews) and new pieces’ own page files wait for the next deploy; a new piece opens at `/shop.html?p=<slug>` until then.
- Edits stay in the browser as a draft until **Publish**. Publish first reads Wix as it is now, merges it with the draft (each text, photo spot, list and piece keeps whichever side changed it) and writes **only what this person changed**, then adds a `StudioVersions` row with their name. If both admins changed the same thing, the Studio asks whose version goes live. If Wix refuses the save, the draft is kept.
- **Two admins at once.** Each admin signs in with their own site-member account, listed in `STUDIO_OWNER_IDS`. Every 30 seconds (and when the tab comes back into view) the Studio checks for a newer publish and new or deleted files: with no draft open it updates by itself; with a draft open it says who published and offers “Bring their changes in”. Older publishes had left duplicate rows in `StudioHomeCopy`; the newest row wins and the next publish removes the rest.
- **Photos** are always shown as a Wix copy sized to their box (`/v1/fit/w_…`), never the original file, with a smaller copy and then the original as fallbacks. Originals of 5–14 MB failed to draw on phones.
- **Photos & films** has *Select several* (bulk delete, files in use are kept), *Not used* and *Look-alikes* (same photo uploaded twice) filters, and uploads run three at a time. Uploads are in Wix at once and don't count as unpublished changes.
- **Each piece (Product pages › 01)**: per piece, "Wears with" (up to 3, stored as `StudioProducts.wearsWith`, site product ids), showcase wall photos (`showcase`, up to 8 URLs) and the wall quote (`wallQuote`). Empty keeps the automatic choice.
- **Simple view** (default, per browser) hides search settings, alt text and the full page list; *Show all options* brings them back.
- Collections that failed to load are skipped on publish, so a bad load can't overwrite live content.
- **Restore** loads a saved version into the draft. Nothing changes on the site until the next publish.

## Not wired yet
- Team invites and roles are not saved. Only the members in `STUDIO_OWNER_IDS` can use the Studio; add an admin's member id there (comma-separated) and redeploy.
- "Send for review" only appears in the Contributor preview and does not notify anyone.
- Product photos are managed in Wix Stores. `StudioLookbook` is not used.
- Consent has no control in the Studio UI, so it does not block publishing.

## How the Studio is laid out
- **Start here**: how it works, shortcuts to common jobs, and every page with its parts.
- **The website · page by page**: Home, The Loop, Shop, Heritage, Founder's Voice, Journal, Product pages, Sign-in. Under each page, its parts in the order visitors scroll through them (the same parts as the site's side dots). Each part opens on its own screen with what visitors see there, a link to it on the site, and everything that can be changed in it: photo spots, words, and its list (New in rail, best-seller rack, the Wall, which pieces show, appearances, pairs, size guide).
- **Used across the site**: Photos & films (the Media Manager library) and Publish history.
- The part definitions live in `PAGES` in the Studio file; add a part there when a section is added to the site.
