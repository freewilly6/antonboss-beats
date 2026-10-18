# R2 split: public previews, private paid files — rollout

**Where things end up**

| Bucket | Access | Holds | How it's reached |
| --- | --- | --- | --- |
| `beat-previews` | public, `https://cdn.antonboss.com` | tagged preview MP3s, new cover art | full URLs stored on `BeatFiles.audiourl` / `.cover` |
| `beat-audio` | **private** | untagged MP3s (`mp3/`), WAVs (`wav/`), stems (`stems/`) | object keys in `beat_assets`, 24-hour presigned links from `/api/downloads` |

**Downloads unlock only after PayPal's webhook confirms payment.** The browser
can capture an order, but only `/api/paypal/webhook` (with a verified signature)
moves a purchase from `pending` to `paid`.

> I've used `antonboss.com` / `www.antonboss.com` as the site's domain below. I
> couldn't find it in the code, so swap in the real one if it's different.

---

## 1. CORS JSON

Cloudflare dashboard → R2 → *bucket* → Settings → CORS policy → Edit → paste.

### `beat-previews` (public)

Browsers stream previews from it, and `/admin` uploads to it directly with presigned PUTs.

```json
[
  {
    "AllowedOrigins": [
      "https://antonboss.com",
      "https://www.antonboss.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type", "Range"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

### `beat-audio` (private)

The browser only ever **uploads** here, from `/admin`. Downloads are top-level
navigations to signed links, so they need no CORS. Leaving GET out means no
other site can fetch-read a signed link from the browser.

```json
[
  {
    "AllowedOrigins": [
      "https://antonboss.com",
      "https://www.antonboss.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

R2 doesn't accept wildcard subdomains in `AllowedOrigins`. If you need to upload
from a Vercel preview, add that preview's exact URL to both lists. (`/admin` on
a preview writes to the same buckets and database as production.)

After the domain move (step 9) you can also set `NEXT_PUBLIC_AUDIO_CORS=1` in
Vercel. Previews then stream straight from the CDN instead of through
`/api/audio-proxy`. This is optional; it saves Vercel bandwidth.

---

## 2. PayPal webhooks

You need **one webhook per PayPal environment**. Each has its own ID.

1. Go to <https://developer.paypal.com> → log in → **Apps & Credentials**.
2. Use the **Sandbox / Live** toggle at the top. Start with **Sandbox**.
3. Open the REST app whose Client ID and Secret are in Vercel (or create one).
4. Scroll to **Webhooks** → **Add Webhook**.
5. **Webhook URL**
   - Live: `https://antonboss.com/api/paypal/webhook`
   - Sandbox: the URL of the deployment you'll test on (see step 6 of the rollout).
     If Vercel Deployment Protection is on for previews, PayPal will be
     blocked by it. In that case, either:
     - use Vercel → Settings → Deployment Protection → *Protection Bypass for
       Automation*, and append `?x-vercel-protection-bypass=<secret>` to the
       webhook URL; or
     - point the sandbox webhook at a deployment that isn't protected.
6. **Event types:** tick exactly these four:
   - `Payment capture completed` (PAYMENT.CAPTURE.COMPLETED): unlocks downloads
   - `Payment capture denied` (PAYMENT.CAPTURE.DENIED)
   - `Payment capture refunded` (PAYMENT.CAPTURE.REFUNDED): a full refund revokes access
   - `Payment capture reversed` (PAYMENT.CAPTURE.REVERSED): chargebacks
7. **Save**, then copy the **Webhook ID** shown in the list (e.g. `8PT597110X687430LKGECATA`).
   That goes in `PAYPAL_WEBHOOK_ID` for the matching Vercel environment.
8. Repeat with the toggle on **Live**, using the production URL.

Checking it: open the webhook → **Webhook events**. After a test purchase, the
COMPLETED event should show delivery status `200`. A `400` means the
signature check failed, usually because `PAYPAL_WEBHOOK_ID` is from the other
environment or app. A `500` is logged in Vercel as `[paypal/webhook]`.

PayPal retries failed deliveries for up to 3 days. A purchase stuck on
"pending" will therefore unlock by itself once the webhook is fixed.

---

## 3. Vercel environment variables

Vercel → Project → Settings → Environment Variables. Changes only take effect
on the **next deployment**.

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | same | probably already set |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | token with **Object Read & Write on both buckets** | same | the current token may only cover `beat-audio`: edit it, or make a new one |
| `R2_PUBLIC_BUCKET` | `beat-previews` | same | **new** |
| `R2_PRIVATE_BUCKET` | `beat-audio` | same | **new** (the old `R2_BUCKET` is still read as a fallback; you can remove it after the deploy) |
| `PUBLIC_R2_URL` | `https://cdn.antonboss.com` | same | **change**: production currently has beat-audio's `pub-….r2.dev` URL. The audio proxy only streams from this host, so it must match the preview URLs (step 7 rewrites them) |
| `NEXT_PUBLIC_R2_URL` | `https://cdn.antonboss.com` | same | change to match |
| `PAYPAL_ENV` | `live` | `sandbox` | **new, required.** Nothing PayPal-related works without it |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` | live app | sandbox app | |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | live client id | sandbox client id | must match `PAYPAL_CLIENT_ID` |
| `PAYPAL_WEBHOOK_ID` | live webhook ID | sandbox webhook ID | **new** |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*` | as now | as now | |

---

## 4. Rollout checklist (in order)

How this keeps every buyer's downloads working:

- `beat-audio` is never made private, and `cdn.antonboss.com` never stops
  pointing at it, **until the new code is live**. The new code doesn't rely on
  either: it signs links with the S3 API, which works whether the bucket is
  public or private.
- The old code (live until step 7) only works while `cdn.antonboss.com` points
  at `beat-audio` and `BeatFiles.wav/stems` are still filled in. The domain
  moves in step 9 and the columns clear in step 11, both after the old code is gone.
- Part A of the migration only adds things. The live site runs fine on it.

### Step 1: Preflight and backup (database)

- [ ] Supabase → Database → Backups: confirm there's a recent backup. On the Pro
      plan, also note the PITR window. On the free plan, run
      `supabase db dump -f backup-before-r2-split.sql` (or Dashboard → Database →
      Backups → download) and keep the file.
- [ ] Run `supabase/migrations/20261018_00_preflight_checks.sql` in the SQL editor.
      It's read-only. Expect:
  - `BeatFiles.wav` / `stems` are text columns.
  - No WAV or stems URLs outside R2. Those can't be converted to keys; tell me if any show up.
  - Any duplicate `paypal_transaction_id`s are listed. Part A handles them:
    the earliest row keeps the order id.

### Step 2: R2 token and CORS

- [ ] Make sure the R2 API token has Object Read & Write on **both** `beat-previews` and `beat-audio`.
- [ ] Paste the CORS JSON above into both buckets.
- [ ] Leave `beat-audio`'s public access (its r2.dev URL) and the `cdn.antonboss.com` domain **exactly as they
      are**. The live site streams previews, and old buyers download, through that r2.dev URL.
- [ ] Check `cdn.antonboss.com` serves beat-audio today: take any beat's preview URL, swap
      `https://pub-….r2.dev/` for `https://cdn.antonboss.com/`, and open it. It must play. If it
      doesn't, connect the domain to beat-audio first (R2 → beat-audio → Settings → Custom Domains).

### Step 3: Vercel env vars

- [ ] Set everything in the table above. This doesn't affect the live site until the next deploy.

### Step 4: PayPal webhooks

- [ ] Create the **sandbox** and **live** webhooks (section 2). Put each ID in
      `PAYPAL_WEBHOOK_ID` for its environment.
      The live URL returns 404 until step 7. That's harmless: PayPal retries,
      and purchases made through the old code are already recorded as paid.

### Step 5: Migration Part A (additive, safe with the live code)

- [ ] Run `supabase/migrations/20261018_01_r2_split_part_a.sql` in the SQL editor. It:
  - backs up `BeatFiles` and `purchases` into a `backup` schema (not reachable through the API);
  - creates `beat_assets` (row-level security on, no policies, anon access
    revoked) and copies existing WAV/stems URLs into it as **keys**;
  - adds `status` / `paypal_order_id` / `paypal_capture_id` / `paid_at` to
    `purchases`, **marks every existing purchase paid**, and keeps new rows
    defaulting to `paid` so the old code still works;
  - adds a unique index on `paypal_order_id`, so one payment can't be recorded twice;
  - creates `paypal_webhook_events`.
- [ ] Check the verification query at the end: purchases are all `paid`, and the
      beats-with-WAV count matches the beat_assets-with-wav_key count.

### Step 6: Sandbox purchase end to end, on a preview deployment

The preview uses the **production database and buckets** with **sandbox PayPal**.

- [ ] Open the PR's preview deployment. Point the sandbox webhook at it (section 2, step 5).
- [ ] Sign in with a test account, add one beat at **Premium**, and pay with a
      sandbox **personal** account (developer.paypal.com → Sandbox → Accounts).
- [ ] Right after paying, the confirmation says *"Payment received. Your files unlock … as soon as PayPal confirms it"*,
      and Account → Library shows the "pending" notice with no download links.
- [ ] Within a few seconds the webhook arrives. The Library unlocks with an
      **MP3** and a **WAV** link, and **no stems** (Premium doesn't include them).
- [ ] Click both. Each downloads as `Anton Boss - <Beat> (WAV).wav` etc. The links
      are `…r2.cloudflarestorage.com/beat-audio/…X-Amz-Expires=86400…`.
- [ ] View the page source of `/`, `/beats` and `/cart`. Search for `beat-audio`, `wav/`
      and `X-Amz`: there should be no matches.
- [ ] Sandbox → refund the payment. The beat disappears from the Library.
- [ ] Clean up the test rows (SQL editor):
      ```sql
      delete from public.purchases where paypal_order_id = '<sandbox order id>';
      delete from public.paypal_webhook_events where order_id = '<sandbox order id>';
      ```
- [ ] Avoid uploading on `/admin` from the preview. New previews would land in
      `beat-previews` and won't play until step 9.

### Step 7: Deploy to production

- [ ] Merge / promote the deploy.
- [ ] **As soon as it's live**, run `supabase/migrations/20261018_03_previews_to_cdn.sql`. It points
      preview URLs at `https://cdn.antonboss.com/<same key>`. Until it runs, previews won't play
      (the new deploy's audio proxy only allows the cdn host), so have it open in the SQL editor
      before you merge. Expect `still_on_r2_dev = 0`.
- [ ] **Freeze admin uploads from now until step 9.** New uploads go to
      `beat-previews`, and the cdn domain won't serve them until it moves.
- [ ] Spot-check with an account that bought something before today: Account →
      Library shows its files. Basic purchases get the tagged MP3, signed from
      `beat-audio`, where it still lives.
- [ ] Watch the live webhook's deliveries after the first real sale (status 200).

### Step 8: Copy the tagged previews into `beat-previews`

Run this locally with production R2 + Supabase credentials in `.env.local`:

- [ ] `node --env-file=.env.local scripts/r2-copy-previews.mjs` (dry run; lists what it would copy)
- [ ] `node --env-file=.env.local scripts/r2-copy-previews.mjs --apply` (server-side copy, same keys;
      only root-level `.mp3`s, never `wav/`, `stems/` or `mp3/`)
- [ ] `node --env-file=.env.local scripts/r2-copy-previews.mjs --verify`
      Every beat's preview URL should be found in `beat-previews`. **Don't continue until it says
      "All previews present ✓".** A preview stored on a `*.r2.dev` URL is checked by its key too.

### Step 9: Move `cdn.antonboss.com` to `beat-previews`

- [ ] R2 → `beat-audio` → Settings → Custom Domains → `cdn.antonboss.com` → **Remove**.
- [ ] R2 → `beat-previews` → Settings → Custom Domains → **Connect Domain** → `cdn.antonboss.com`.
      Expect a minute or two of propagation. During that time, previews may not
      play. Downloads aren't affected; they never use this domain.
- [ ] Check: open any beat's preview URL. It plays. `https://cdn.antonboss.com/wav/<any>.wav` returns 404.
- [ ] Caching: Cloudflare may serve cached copies of old `wav/`/`stems/` URLs for a
      while. Go to Cloudflare → the zone → Caching → **Purge Everything** (or purge by prefix
      `cdn.antonboss.com/wav/` and `/stems/`).
- [ ] **Unfreeze admin uploads.** Upload a test beat and confirm its preview plays.

### Step 10: Turn off public access on `beat-audio`

Only after step 7's SQL has run and step 9 is done. Turning it off earlier stops
previews playing and breaks old buyers' downloads on the old code.

- [ ] R2 → `beat-audio` → Settings → **Public Development URL (r2.dev)** → Disable.
      Make sure it has **no** custom domains left.
- [ ] Check: an old `https://pub-….r2.dev/wav/….wav` URL now fails (401/404).
- [ ] Check: Account → Library downloads **still work**. They're signed and don't need public access.

### Step 11: Migration Part B (cleanup; only after step 7 is live)

- [ ] Run `supabase/migrations/20261018_02_r2_split_part_b.sql`. It:
  - clears `BeatFiles.wav` / `stems` (the public URLs);
  - reduces `BeatFiles.licenses` to name + price;
  - strips file URLs out of saved `purchases.beats`;
  - switches new purchases to default to `pending`.
- [ ] Check the verification query at the end: zero rows still holding paid-file URLs.
- [ ] After this, rolling back to the **old code** would break its downloads. Use
      `20261018_99_rollback.sql` first if you ever need to do that.

### Step 12: Upload the untagged MP3s

- [ ] `/admin` → **No untagged MP3 (n)** filter → **Replace MP3** on each beat. Or run
      `supabase/migrations/20261018_report_missing_untagged_mp3.sql` for the list.
      Until a beat has one, its Basic buyers get the tagged MP3. This works now; it's just tagged.

### Step 13: Optional live check

- [ ] Buy your own cheapest license with a real card. Confirm it unlocks, then refund it in PayPal.

### Step 14: About a week later

- [ ] Delete `src/pages/api/complete-purchase.js`. It only exists for shoppers
      whose cart page loaded before the deploy, and it records their order as
      **pending**, so it still waits for the webhook.
- [ ] Remove the old `R2_BUCKET` env var.
- [ ] Drop the backups once you're happy: `drop schema backup cascade;`

---

## Rolling back

- **Before step 9:** redeploy the previous build. It works unchanged on Part A.
  Purchases made through the new code are `pending` until the webhook confirms
  them, but the old code ignores `status`.
- **Between 9 and 11:** move `cdn.antonboss.com` back to `beat-audio` (and
  re-enable r2.dev if you disabled it), then redeploy the old build.
- **After 11:** run `20261018_99_rollback.sql` (it restores from `backup`), then do the above.
