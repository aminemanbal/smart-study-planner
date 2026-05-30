# Deployment Guide — Smart Study Planner

This matches the architecture described in the internship report:

| Tier      | Platform                | Result URL (example)                                |
|-----------|-------------------------|-----------------------------------------------------|
| Database  | **MongoDB Atlas** (M0)  | `mongodb+srv://…@cluster0.xxxxx.mongodb.net/…`      |
| Backend   | **Render** (Node.js)    | `https://smart-study-planner-api.onrender.com`      |
| Frontend  | **Vercel** (Vite/React) | `https://smart-study-planner.vercel.app`            |

Deploy in this order — each step needs the URL from the previous one.

---

## 0. Prerequisites

- Code pushed to a **public GitHub repo** named `smart-study-planner`.
- A **Groq API key** → https://console.groq.com/keys (free).
- Accounts on **MongoDB Atlas**, **Render**, and **Vercel** (all free,
  sign in with GitHub).

> The repo already contains everything the platforms need:
> `render.yaml` (backend blueprint), `client/vercel.json` (SPA routing),
> `engines.node = 20.x`, and CORS that locks to `CLIENT_URL`.

---

## 1. MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → sign in.
2. **Create** → **Deploy a cluster** → choose **M0 (Free)** → pick a
   region close to you → **Create Deployment**.
3. **Database Access** → *Add New Database User*:
   - Username: `studyplanner`
   - Password: click **Autogenerate** and **copy it somewhere safe**.
   - Role: *Read and write to any database* → **Add User**.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`) → **Confirm**.
   *(Render's IPs are dynamic on the free plan, so this is required.)*
5. **Clusters** → **Connect** → **Drivers** → copy the connection string.
   It looks like:
   ```
   mongodb+srv://studyplanner:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Edit it:
   - Replace `<password>` with the password from step 3.
   - Insert the database name **before** the `?`:
   ```
   mongodb+srv://studyplanner:YOURPASS@cluster0.xxxxx.mongodb.net/studyplanner?retryWrites=true&w=majority
   ```
   Keep this final string — it's your **`MONGO_URI`**.

---

## 2. Render (backend)

### Option A — Blueprint (uses the committed `render.yaml`)

1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` and proposes the
   `smart-study-planner-api` web service.
3. It will prompt for the `sync: false` env vars — fill them in:

   | Key            | Value                                                        |
   |----------------|--------------------------------------------------------------|
   | `MONGO_URI`    | the Atlas string from step 1.6                               |
   | `JWT_SECRET`   | a long random string (see below)                             |
   | `GROQ_API_KEY` | your `gsk_…` key                                             |
   | `CLIENT_URL`   | leave blank for now — you'll set it after Vercel (step 4)    |

4. **Apply** / **Create**. First build takes ~2–3 min.

### Option B — Manual (no blueprint)

1. **New +** → **Web Service** → connect the repo.
2. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Environment** → add the four variables from the table above.
   **Do not** add `PORT` — Render injects it and `index.js` reads it.
4. **Create Web Service**.

### Generate a JWT secret

Run locally and copy the output:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Verify

When the deploy is **Live**, open the service URL in a browser
(e.g. `https://smart-study-planner-api.onrender.com`). You should see:
```json
{ "status": "Smart Study Planner API running" }
```
The logs should show `MongoDB connected ✅`. **Copy your backend URL** —
you need it for Vercel.

> ⚠️ **Free-plan cold starts:** Render free services sleep after ~15 min
> idle and take ~30–50 s to wake on the next request. For your demo, open
> the backend URL once a minute before presenting so it's warm.

---

## 3. Vercel (frontend)

1. https://vercel.com → **Add New…** → **Project** → import your repo.
2. Configure:
   - **Root Directory:** `client`  ← click *Edit* and select it.
   - Framework Preset: **Vite** (auto-detected).
   - Build & output are read from `client/vercel.json` — leave defaults.
3. **Environment Variables** → add:

   | Key            | Value                                            |
   |----------------|--------------------------------------------------|
   | `VITE_API_URL` | your Render backend URL (no trailing slash), e.g. `https://smart-study-planner-api.onrender.com` |

4. **Deploy**. After ~1 min you get your frontend URL, e.g.
   `https://smart-study-planner.vercel.app`.

> `VITE_*` vars are baked in at **build time**. If you change
> `VITE_API_URL` later, you must **redeploy** for it to take effect.

---

## 4. Close the loop (CORS)

Now that you have the Vercel URL, lock the backend's CORS to it:

1. Render → your service → **Environment** → set:
   ```
   CLIENT_URL = https://smart-study-planner.vercel.app
   ```
   (Your exact Vercel domain. Multiple allowed origins? comma-separate them.)
2. Save → Render redeploys automatically.

This is optional for *functionality* (the API works with open CORS) but
it's the professional, secure setup the report describes.

---

## 5. End-to-end smoke test (the evaluator's flow)

On the **deployed Vercel URL** — not localhost:

1. Register a new account.
2. Add 3 subjects with different difficulty levels.
3. Schedule 2+ exams with different dates and priorities.
4. Click **Generate with AI** (or Quick Plan) → tasks appear.
5. Mark a few tasks done → progress updates.
6. Open **Progress** → charts render.
7. Open **Dashboard** → countdowns, today's tasks, AI suggestions.
8. Open **AI Tutor** → ask a question, attach a PDF, confirm a grounded answer.
9. Open **Focus** → start a Pomodoro session.

---

## 6. Git tags (per the spec)

```bash
git tag week2  && git push origin week2
git tag week3  && git push origin week3
git tag week4  && git push origin week4
git tag week5  && git push origin week5
git tag week6  && git push origin week6
git tag week7  && git push origin week7
git tag final  && git push origin final
```

---

## Environment variables — summary

**Render (backend):**
```
MONGO_URI     = mongodb+srv://studyplanner:…@cluster0.xxxxx.mongodb.net/studyplanner?retryWrites=true&w=majority
JWT_SECRET    = <64-hex-random>
GROQ_API_KEY  = gsk_…
CLIENT_URL    = https://smart-study-planner.vercel.app
# PORT is injected by Render — do not set it.
```

**Vercel (frontend):**
```
VITE_API_URL  = https://smart-study-planner-api.onrender.com
```

Never commit real `.env` files — `.gitignore` already excludes them, and
`server/.env.example` + `client/.env.example` document every variable.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Frontend loads but every request fails (Network/CORS error) | `VITE_API_URL` wrong or missing → fix in Vercel, **redeploy**. Check `CLIENT_URL` on Render matches the Vercel origin exactly (no trailing slash). |
| `MongoDB connection error` in Render logs | `MONGO_URI` password wrong, or Atlas **Network Access** doesn't allow `0.0.0.0/0`. |
| Login/refresh works locally but 404s on deep links in prod | Ensure `client/vercel.json` is deployed (SPA rewrite). |
| First request after idle is very slow | Render free-tier cold start (~30–50 s). Warm it before the demo. |
| AI features return 503 "GROQ_API_KEY not set" | Add `GROQ_API_KEY` on Render → redeploy. |
| PDF upload fails | File must be a text-based PDF ≤ 10 MB (scanned/image PDFs have no extractable text). |
