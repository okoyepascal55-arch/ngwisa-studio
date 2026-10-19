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
6. **Create the `StudioProducts` collection** (Wix CMS), permissions as in the table below, with these fields: `title` (text, the Wix product name), `productId` (text), `slug` (text), `seedId` (text), `hidden` (boolean), `displayName` (text), `category` (text), `gender` (text), `hook` (text), `best` (number), `restock` (boolean), `seoTitle` (text), `seoDescription` (text), `order` (number). Then open Studio › Products and publish once (see below).
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
| Site map, Hero film | `StudioSiteSlots` (title = spot id, fileUrl, alt, focalX, focalY) |
| Site copy | `StudioHomeCopy` (title = copy key, text) |
| New in rail | `StudioNewInRail` (productId, order) |
| Call & Answer | `StudioPairs` (callProductId, answerProductId, order) |
| Appearances | `StudioAppearances` (title, type, city, year, coverUrl, gallery, body, order) |
| Worn by you | `StudioWornByYou` (fileUrl, title, city, show, order) |
| Products | `StudioProducts` (one row per Wix product: shown or hidden, name on the site, category, who it's for, hook, best-seller rank, restocking, search title and description, link to the design's built-in piece) |
| Size guide | `StudioSizeGuide` (opens from "Size guide →" on every product page, in cm or inches) |
| Search & sharing (each page) | `StudioHomeCopy` (`seo<Page>T`, `seo<Page>D`) |
| History | `StudioVersions` (version, at, by, summary, snapshot JSON with media as URLs) |

## The shop and Wix Stores
- Wix Stores is the catalogue: the site lists every visible Wix product that Studio › Products doesn't hide, with its Wix price, photos, description, sizes and stock. Stock for every piece comes from one inventory query; a piece's sizes load when it is opened.
- **First publish of Products.** Until `StudioProducts` has rows, the shop shows only the pieces it showed before (the old fixed list), so nothing changes on deploy. The Products screen starts with those pieces marked Shown and the rest Hidden; publishing once makes the screen the source of truth. From then on a piece added in Wix shows on the site by itself (and is flagged "New in Wix" in the Studio).
- Pieces in the design that aren't in Wix (e.g. Mita Set, Gong Waistcoat) stay on the site as "price on request". Add a Wix product with the same name to sell one online; the Studio links them by name, or by the saved link once published.
- Checkout is Wix's hosted checkout. Paid orders return to `/thank-you`, which shows the order to signed-in members and a confirmation note to guests.

## How the site uses it
- The site reads the collections above with the visitor token in `ngwisa-wix.js`.
- Copy keys fill text across Home, Founder's Voice, Heritage, Journal/Appearances, the stories, the wall and the footer. Anything blank falls back to the wording built into the page.
- Image spots (`SPOTS` and the hero, deck and journal slots) use the published file, alt text and focus point. An empty spot falls back to the original photo.
- `api/page.js` reads the same collections (and Wix Stores) on the server, so each address is served with its own title, description, share image and structured data. It caches for 5 minutes, so a publish shows in search previews within about 5 minutes. If Wix is unreachable the page still loads with its built-in titles.

## Publish and history
- Edits stay in the browser as a draft until **Publish**. Publish writes everything above, then adds a `StudioVersions` row. If Wix refuses the save, the draft is kept.
- Collections that failed to load are skipped on publish, so a bad load can't overwrite live content.
- **Restore** loads a saved version into the draft. Nothing changes on the site until the next publish.

## Not wired yet
- Team invites and roles are not saved. Only the members in `STUDIO_OWNER_IDS` can use the Studio.
- "Send for review" only appears in the Contributor preview and does not notify anyone.
- Product photos and Lookbook screens are not in the menu (product photos are managed in Wix Stores).
- Consent has no control in the Studio UI, so it does not block publishing.
