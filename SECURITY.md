# Securing Aura before deployment

Two things need protecting: your **Gemini API key** and your **MongoDB
connection string**. Both already follow the right architectural pattern —
neither one is ever sent to the browser — but here's the full picture plus
the hardening this update adds.

---

## 1. The core principle: secrets never leave the backend

The browser only ever talks to **your** Express server. It never calls
Gemini or MongoDB directly, and it never receives `GEMINI_API_KEY` or
`MONGO_URI` in any response. Open your browser's DevTools → Network tab
while using the app and you'll only see calls to `/api/chat`, `/api/chat/sessions`,
etc. — no Google or MongoDB hosts, no keys in headers or payloads.

This matters because of how Vite works: **only environment variables
prefixed with `VITE_` are bundled into the frontend's JavaScript**, and
anything bundled is visible to anyone who views your site's source. As long
as your secrets stay in `backend/.env` (no `VITE_` prefix, never imported
into `frontend/`), they physically cannot end up in the browser bundle.
This project already keeps that boundary — don't cross it by, say, adding a
`VITE_GEMINI_API_KEY` for a "quick test."

---

## 2. Keeping secrets out of Git

`.env` files are already in `.gitignore` at the project root, so `git add .`
won't pick them up. Two things worth doing before you push:

1. **Confirm nothing was committed already**, especially if you typed a real
   key into `.env` before checking `.gitignore` was in place:
   ```bash
   git log --all --full-history -- "**/.env"
   ```
   If that returns commits, the key is in your Git history even if you
   delete the file now — rotate the key (see §4) and consider
   `git filter-repo` or BFG Repo-Cleaner to scrub history.
2. **Never paste a real key into `.env.example`.** This repo's examples use
   placeholders like `your_gemini_api_key_here` — keep it that way; that
   file *is* meant to be committed.

On your hosting provider, environment variables are entered through their
dashboard (Render's **Environment** tab, Vercel's **Environment Variables**
page) — encrypted at rest, never written into your repo or build logs.

---

## 3. MongoDB Atlas: scope the database user

When you created a database user in Atlas, it's easy to default to a broad
role. Tighten it:

- **Database Access → your user → Edit → Built-in Role**: use
  **Read and write to any database** only if you must; better is a
  **custom role** scoped to just the `speech-assistant` database your app
  uses. For a single-app project the built-in `readWrite` role on that one
  database is enough — avoid `atlasAdmin` or `dbAdminAnyDatabase`.
- **Use a dedicated user for this app** — don't reuse your personal Atlas
  login's credentials or a user shared with other projects. If this app's
  key ever leaks, only this app's data is exposed.
- **Network Access (`0.0.0.0/0`)**: this is necessary because Render/Vercel
  use dynamic IPs you can't pin down in advance. It is *not* the same as
  leaving the database open — connections still require the username and
  password from your connection string. If your host offers static
  outbound IPs (Render's paid plans, AWS, etc.), switch to an IP allowlist
  instead for tighter control.
- **Rotate the password periodically**, and immediately if you ever suspect
  it leaked (e.g. accidentally pasted into a public chat, screenshot, or
  committed file). Atlas lets you edit a database user's password without
  changing the username — update it in Atlas, then update `MONGO_URI` in
  your hosting provider's environment variables, then restart the service.

---

## 4. Gemini API key: restrict and rotate

- **Restrict the key's scope.** In
  [Google AI Studio](https://aistudio.google.com/apikey), keys are tied to
  a Google Cloud project — in that project's
  [Credentials console](https://console.cloud.google.com/apis/credentials),
  you can restrict the key to only the **Generative Language API**, so even
  if it leaked, it couldn't be used against unrelated Google APIs on your
  project.
- **Set a budget/quota alert** in Google Cloud Billing for the project, so
  a leaked or abused key triggers an alert instead of a surprise invoice.
- **Rotate immediately if exposed.** Generate a new key, update it in your
  host's environment variables, redeploy, then delete the old key from AI
  Studio.
- **Never log the key.** This codebase never logs `GEMINI_API_KEY` or
  includes it in error messages returned to the client — keep it that way
  if you modify `utils/geminiService.js`.

---

## 5. What this update adds: abuse protection

Even with the key itself secured, an unprotected `/api/chat` endpoint is
still a way for someone to run up your Gemini bill or hammer your database —
just by calling your API directly (not through the UI at all). This update
adds:

- **`helmet`** — sets standard security headers (removes `X-Powered-By`,
  adds sane defaults) on every response.
- **Rate limiting** (`express-rate-limit`) — two tiers:
  - A loose limit (300 requests / 15 min / IP) on all `/api` routes.
  - A strict limit (20 requests / minute / IP) specifically on
    `POST /api/chat`, since that's the endpoint that costs you Gemini
    tokens and writes to MongoDB.
- **Input validation** — `POST /api/chat` now rejects non-string fields,
  caps message length at 2000 characters, and validates `sessionId`/
  `language` against simple safe-character patterns before anything
  touches Gemini or the database.
- **Smaller body size limit** — `express.json()` now caps request bodies at
  100kb (was 1mb) — plenty for a spoken sentence, not enough for someone to
  send you a huge payload.
- **Generic error messages in production** — when `NODE_ENV=production`,
  `/api/chat` returns a generic failure message instead of the raw
  exception text, so internal details (library versions, upstream response
  shapes) aren't exposed to callers. Locally (`NODE_ENV` unset), you still
  see the full error for debugging.
- **CORS locked to known origins** — already in place from the deployment
  update: only the URLs you list in `CLIENT_ORIGIN` can call the API from a
  browser.

Install the two new dependencies before deploying:
```bash
cd backend
npm install
```

---

## 6. Quick pre-deployment checklist

- [ ] `backend/.env` has real values; it is **not** committed (`git status`
      shows it ignored)
- [ ] `git log --all -- "**/.env"` returns nothing
- [ ] MongoDB Atlas database user is scoped to this app's database only
- [ ] Gemini API key is restricted to the Generative Language API
- [ ] `CLIENT_ORIGIN` on your deployed backend lists your real frontend
      URL(s) — not `*`
- [ ] `NODE_ENV=production` is set on your hosting provider
- [ ] `npm install` run after pulling this update (adds `helmet` and
      `express-rate-limit`)
- [ ] Billing alerts set up in Google Cloud for the Gemini-linked project
