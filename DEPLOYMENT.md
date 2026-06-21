# Deploying Aura

This guide takes you from zero to a live, public URL using:
- **MongoDB Atlas** (free tier) for the database
- **Render** for the backend (Express API) — Railway works the same way if you prefer it
- **Vercel** for the frontend (React/Vite)

You don't have to use these exact providers, but the steps map closely onto any
Node host (backend) + static host (frontend).

> **Before you deploy**, also read **[SECURITY.md](./SECURITY.md)** — it
> covers scoping your MongoDB Atlas user, restricting the Gemini key, and
> the rate-limiting/validation already built into the backend.

---

## Part 1 — MongoDB Atlas

Atlas automatically creates your database and collections the first time
data is written — there is no schema or table to set up by hand. You only
need to create the *cluster*, a *database user* (the "username/password
link" you connect with), and allow network access.

1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)** and sign up / log in.
2. **Create a cluster** → choose the free **M0** tier → pick any cloud
   provider/region close to you → Create.
3. **Database Access** (left sidebar) → **Add New Database User**
   - Authentication Method: Password
   - Username/Password: pick something simple (avoid `@`, `/`, `:` in the
     password — they break connection strings; if you must use them,
     URL-encode them).
   - Built-in Role: **Read and write to any database**
   - Add User.
4. **Network Access** (left sidebar) → **Add IP Address**
   - Click **Allow Access From Anywhere** (`0.0.0.0/0`).
   - This is necessary because Render/Railway/Vercel use dynamic IPs you
     can't predict in advance. (Atlas still requires your username/password
     to connect — this setting alone doesn't expose your data.)
5. **Database** (left sidebar) → **Connect** on your cluster → **Drivers**
   → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Edit it:
   - Replace `<username>` and `<password>` with the database user you created
     in step 3 (not your Atlas login).
   - Add a database name right after `.net/`, e.g. `.net/speech-assistant?...`
     — Atlas will create this database automatically on first write.

   Final result:
   ```
   mongodb+srv://aura_user:yourpassword@cluster0.xxxxx.mongodb.net/speech-assistant?retryWrites=true&w=majority
   ```

   This full string is your `MONGO_URI`. Keep it secret — you'll paste it
   into your hosting provider's environment variables, never into code.

---

## Part 2 — Backend (Render)

1. Push this project to a GitHub repo (Render deploys from Git).
2. Go to **[render.com](https://render.com)** → **New** → **Web Service** →
   connect your repo.
3. Render auto-detects `render.yaml` at the repo root and pre-fills these
   settings — confirm or set them manually if you skip the blueprint:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables (Render → your service → **Environment**):
   | Key | Value |
   |---|---|
   | `MONGO_URI` | the connection string from Part 1 |
   | `GEMINI_API_KEY` | your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `CLIENT_ORIGIN` | leave blank for now — you'll fill this in after Part 3 |
   | `NODE_ENV` | `production` |
5. Deploy. Once live, note your backend URL, e.g.
   `https://aura-speech-assistant-backend.onrender.com`.
6. Verify it: visit `https://your-backend-url/api/health` — you should see
   `{"status":"ok", "dbConnected": true, ...}`. If `dbConnected` is `false`,
   check the Render logs for the specific Atlas error (auth, network, or
   hostname — `config/db.js` prints a hint for each).

---

## Part 3 — Frontend (Vercel)

1. Go to **[vercel.com](https://vercel.com)** → **Add New** → **Project** →
   import the same repo.
2. Configure:
   - **Root Directory:** `frontend`
   - Framework Preset: Vite (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
3. Add an environment variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend-url/api` (from Part 2, step 5) |
4. Deploy. Note your frontend URL, e.g. `https://aura-voice.vercel.app`.

---

## Part 4 — Connect them

Go back to **Render → your backend service → Environment** and set:

```
CLIENT_ORIGIN=https://aura-voice.vercel.app
```

(Comma-separate multiple URLs if you also test from `localhost:5173`:
`CLIENT_ORIGIN=http://localhost:5173,https://aura-voice.vercel.app`)

Save — Render redeploys automatically. Open your Vercel URL, allow
microphone access, and talk to Aura. Conversations should now appear in the
sidebar and persist in Atlas — check **Atlas → Browse Collections** to see
the `conversations` documents appear in real time as you chat.

---

## Troubleshooting

- **CORS error in the browser console** — `CLIENT_ORIGIN` on the backend
  doesn't match your frontend's exact URL (including `https://`, no
  trailing slash). Update it and wait for the redeploy.
- **Sidebar always empty / "Chat history needs MongoDB connected"** — check
  `/api/health` on your backend; `dbConnected: false` means `MONGO_URI` is
  wrong or Network Access isn't set to allow your host's IP.
- **Gemini errors in chat** — double check `GEMINI_API_KEY` is set on the
  backend (not the frontend — the frontend never touches this key) and that
  the key is active in AI Studio.
- **Mic doesn't work at all** — the Web Speech API requires HTTPS (or
  `localhost`). Both Vercel and Render serve over HTTPS by default, so this
  should only come up in local testing over plain HTTP on another device.
