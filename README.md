# Ngwisa gong gallery

Headless Wix storefront + Ngwisa Studio admin. Wix runs the shop (products, stock, cart, checkout, orders, members, CMS, media); this repo is the front end, hosted on Vercel.

## How it fits together

| Part | What it does |
|---|---|
| `Ngwisa Site Deploy.dc.html` | The site, as Claude Design writes it. Pages: `/`, `/the-loop`, `/shop`, `/shop/<piece>`, `/heritage`, `/founders-voice`, `/journal`, `/thank-you`. Studio on `/studio`. |
| `Ngwisa Studio.dc.html` | Owner-only admin: site copy, photo spots, Products, New in, Call & Answer, appearances, worn by you, size guide, search & sharing, Media Manager. |
| `ngwisa-wix.js` | Wix client for the browser (Stores, Cart, Checkout, Members, Data) and the shared catalogue rules used by the site, the Studio and the server. |
| `api/page.js` | Serves every page address with its own title, description, share image and structured data (JSON-LD), read from Wix. |
| `api/sitemap.js`, `api/robots.js` | `/sitemap.xml` (every page and shown piece) and `/robots.txt`. |
| `api/studio.js` | The Studio's only route to write to Wix: checks the signed-in owner, then uses the site's API key. |
| `lib/` | Shared server code: settings, page shell, SEO, public Wix reads. |
| `scripts/build.js` | Builds `dist/`: compiles the JSX, self-hosts React, minifies and versions scripts, drops the editor thumbnail. |

## Where things are decided

- **Wix Stores**: which pieces exist, names, prices, photos, descriptions, sizes, stock, and each piece's URL slug (`/shop/<slug>`).
- **Studio › Products** (`StudioProducts`): which pieces the site shows, category, who it's for, hook line, best-seller rank, restocking note, search title and description.
- **The design's built-in list** (in the site file): fills anything neither has yet, and holds pieces sold "on request" that aren't in Wix.

Until Products is published from the Studio for the first time, the shop shows the same pieces it always did. After that, a piece added in Wix appears on the site by itself.

## Run it

```bash
npm install
npm run build      # writes dist/
node server.js     # http://localhost:3000, same routes as Vercel
```

Vercel runs `npm run build` on every deploy (`vercel.json`). See `Ngwisa Studio Wix Setup.md` for the Wix side: collections, permissions, API key and domains.

## Hosting on Wix

The public site is served by Wix at `https://ngwisa-gong-gallery-sjkgracee-1309.wix-site-host.com` (headless site `613b5fe3-6f29-414b-80fc-abe05f934d56`). Vercel still runs the Studio's save function (`/api/studio`, it holds the Wix API key) and builds the Wix bundle.

- Wix's file hosting serves files at their exact paths, so every address is its own file: `/shop.html`, `/shop/<piece>.html`, `/studio.html`, `/thank-you.html` (`scripts/build-wix.js`). Each has its own title, description, share image and structured data.
- Every push to `main` makes Vercel rebuild `https://ngwisa-studio.vercel.app/ngwisa-wix.zip` from live Wix data. Putting it on Wix is a separate step: import that zip into the site's Media Manager, read it back, and drop it onto the headless site (`POST /headless-business-setup/v1/headless-business/<site id>/drop`), as Claude did on the first deploy. A piece added in Wix shows in the shop straight away; its own `.html` page appears on the next deploy.
- Built scripts and the Studio carry a content hash in their file names (`ngwisa-wix.<hash>.js`, `ngwisa-studio-<hash>.dc.html`): Wix's cache ignores `?v=` query strings and kept serving an old Studio file for hours. Pages carry `<meta name="ngwisa-build">` with the commit they were built from, to check what's live.
- Studio content (text, photos, lists, product settings) is read live from Wix by the site, so a Studio publish shows on the next page load; the Studio confirms it after each publish.
- Wix generates `robots.txt` and `sitemap.xml` for the site itself (SEO Tools in the Wix dashboard), so the ones in the bundle are not used there.
