# Deploy Draft 1 → hatfield-mccoy-dtf.futrbusiness.com

**Target URL:** https://hatfield-mccoy-dtf.futrbusiness.com
**Stack:** Vercel (static) + Cloudflare DNS
**Time to live:** ~5 minutes after DNS propagates (usually <2 min on Cloudflare)
**Status:** Staging — `noindex` + robots.txt disallow applied so it won't get crawled

---

## Step 1 — Deploy to Vercel (2 min)

**Option A: Vercel CLI (fastest)**

From your machine, in the `deliverables/prototype/` folder:

```bash
npm i -g vercel           # only the first time
cd deliverables/prototype
vercel                    # first run — answers: link to new project, name "hatfield-mccoy-dtf"
vercel --prod             # publishes production deployment
```

Vercel will give you a default URL like `hatfield-mccoy-dtf.vercel.app`. Open it and confirm the site renders before moving on.

**Option B: Drag-and-drop (no CLI)**

1. Go to https://vercel.com/new
2. Click "Deploy" → "Other" → drag the `prototype/` folder onto the upload area
3. Name the project `hatfield-mccoy-dtf`
4. Deploy

---

## Step 2 — Add the custom domain in Vercel (1 min)

1. Open the project in Vercel → **Settings → Domains**
2. In the input, type: `hatfield-mccoy-dtf.futrbusiness.com` → **Add**
3. Vercel will show one of two instructions:
   - "Set the following CNAME" → `cname.vercel-dns.com` ← **use this one**
   - Or an A record `76.76.21.21` (only if CNAME isn't allowed — not our case)
4. Leave that tab open; you'll come back after Step 3

---

## Step 3 — Add the CNAME at Cloudflare (1 min)

1. Go to https://dash.cloudflare.com → select **futrbusiness.com** → **DNS → Records**
2. Click **Add record**:
   - **Type:** `CNAME`
   - **Name:** `hatfield-mccoy-dtf`
   - **Target:** `cname.vercel-dns.com`
   - **Proxy status:** **DNS only (grey cloud)** — ⚠️ very important
   - **TTL:** Auto
3. Save

> **⚠️ Proxy status must be grey-cloud DNS-only.** Orange-cloud (proxied) breaks Vercel's automatic SSL cert issuance and you'll get a cert error for ~24 hours until it sorts itself out. If you want the Cloudflare proxy on, we can configure it after SSL provisions — but keep it off for the first deploy.

---

## Step 4 — Wait for Vercel to verify (30 sec to 2 min)

Flip back to the Vercel Domains tab. It will:
1. Detect the CNAME ("Valid Configuration" ✅)
2. Auto-issue a Let's Encrypt SSL cert
3. Flip the domain to active

Open https://hatfield-mccoy-dtf.futrbusiness.com — you should see the neon first draft with the `First Draft — H&M Review` flag in the bottom-right corner.

---

## Step 5 — Send to Nicole

Once live, update the placeholder link in `../client-email-sku-request.md`:

```
[First-draft prototype — H&M DTF](https://hatfield-mccoy-dtf.futrbusiness.com)
```

Then send.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ERR_TOO_MANY_REDIRECTS` | Cloudflare SSL/TLS mode is "Flexible" — change to "Full (strict)" in Cloudflare → SSL/TLS → Overview |
| Cert error / `NET::ERR_CERT_AUTHORITY_INVALID` | Cloudflare proxy is on (orange cloud). Switch the CNAME to DNS-only |
| 404 on the deploy | You uploaded the parent folder. Make sure `index.html` is at the root of the Vercel project |
| Site loads but no fonts | Google Fonts blocked — hard-refresh (Cmd+Shift+R). If persistent, we can self-host Anton |

---

## What to do on this same project once client assets land

This Vercel project becomes the staging environment for the real Next.js build. When Nicole delivers:
- Shopify collaborator access → wire Storefront API, delete static product data from `index.html`
- Missing SKUs → load in Shopify Admin, they flow through the API automatically
- Brand story copy → replace the `[Placeholder copy]` line in the "Our Feud" section
- Real testimonials + turnaround times → replace the `TBD` stats + FAQ placeholders

Same URL, same DNS record. Only the underlying framework changes from static HTML → Next.js.

---

*Owner: GoHighLevel Mastery | Draft deployed from: `deliverables/prototype/`*
