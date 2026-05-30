# Smart Study Planner — Development Log

A complete record of the features built on top of the DevCore Academy
spec, in the order they happened.

---

## 1. Spec audit & project alignment

**Starting point:** the bare skeleton had the right models and routes
but was missing pieces the PDF mandated:
- `server/config/db.js` (DB connection was inlined in `index.js`)
- `server/controllers/` (route handlers lived inside route files)
- `server/.env.example`
- `client/src/services/`, `client/src/context/`
- `client/src/components/{TaskCard, ExamCountdown, ProgressChart}.jsx`
- A real root `package.json`, `README.md`, `.gitignore`

**What changed**
- Split route files into thin Express routers backed by **controllers**
  (one per resource): `authController`, `subjectController`,
  `examController`, `taskController`, `progressController`.
- Extracted `connectDB()` into `server/config/db.js`.
- Created a full Axios service layer on the client:
  `api.js` with a JWT interceptor + 401 handler, plus per-resource
  services (`authService`, `subjectService`, `examService`,
  `taskService`, `progressService`).
- Created `AuthContext` with `login` / `register` / `logout` / `me`
  bootstrap on mount.
- Wrote a proper README documenting structure, setup, data model, API
  reference, and the planner algorithm.

**Result:** layout matched the PDF 1-to-1, the evaluator could find
every required file.

---

## 2. Professional design pass

The default UI was generic. Rebuilt the design system end-to-end.

- **Fonts:** Inter (body) + Plus Jakarta Sans (display) loaded from
  Google Fonts with preconnect.
- **Palette:** custom `brand` indigo→violet→pink with helper gradients
  (`bg-brand-gradient`, `bg-mesh`).
- **Reusable classes** in `index.css`: `.card`, `.card-hover`, `.input`,
  `.label`, `.btn-{primary,secondary,ghost,danger}`, `.pill`,
  `.section-title`, custom thin scrollbars.
- **Custom shadows:** `shadow-soft`, `shadow-card`, `shadow-glow`
  (colored glow on primary CTAs).
- **Inline SVG icon library** (`Icons.jsx`) — 14+ heroicons-style icons
  plus a gradient logo mark.
- **Sidebar** replaces the top nav: active-state pills, gradient brand
  mark, mobile slide-in with backdrop blur, user avatar block.
- **Layout shell**: sidebar + responsive top bar + title/subtitle/actions.
- **Split-screen auth pages** with brand gradient mesh, blurred orbs,
  stats grid (Login) and benefits list (Register).
- **Polished pages** for Dashboard, Subjects, Exams, Tasks, Progress —
  stat cards with colored icons, suggestions colored by tone, 14-day
  heatmap calendar, animated fade-in transitions.

**Build:** 652 modules, 29 kB CSS, 213 kB gzipped JS.

---

## 3. AI features — first pass

Built three Claude-powered features:

1. **AI study plan generator** — replaces the rule-based planner.
   Reads subjects, exams, past performance; LLM returns structured
   JSON with specific task titles ("Review chapter 3: derivatives")
   instead of generic "Session 1" labels.
2. **AI dashboard suggestions** — replaces the hardcoded "if missed > 3
   then catch up" rules with 2-4 tone-tagged tips generated from a
   data snapshot.
3. **Pulse — streaming AI coach** — slide-out chat panel everywhere
   in the app. Uses **tool calling** so the agent can read tasks,
   exams, progress, mark tasks done, and regenerate the plan.

**Architecture**
- `server/services/aiService.js` — Anthropic SDK wrapper, JSON-mode
  outputs, streaming + manual tool-use loop for chat, prompt caching.
- `server/controllers/aiController.js` + `routes/ai.routes.js`:
  `POST /api/ai/plan/generate`, `GET /api/ai/insights`,
  `POST /api/ai/chat` (SSE).
- `client/src/services/aiService.js` — REST helpers + fetch-based SSE
  reader (so JWT can travel in the Authorization header).
- `client/src/components/ChatPanel.jsx` — slide-in drawer with
  streaming text, tool-call status pills, suggested prompts.
- Floating "Ask Pulse" CTA in `Layout.jsx`.

---

## 4. Switch from Claude to Groq

Anthropic has no real free tier — the API returned **"credit balance
too low"** on the first request. Switched providers.

**One file rewritten:** `server/services/aiService.js`.
- SDK swap: `@anthropic-ai/sdk` → `openai` (pointed at Groq's
  OpenAI-compatible endpoint `https://api.groq.com/openai/v1`).
- Model: `llama-3.3-70b-versatile`.
- Tool calling translated from Anthropic's content-block format to
  OpenAI's `tool_calls` + `role:'tool'` message format. Streaming loop
  accumulates `tool_calls` deltas by index across chunks.
- Structured outputs via `response_format: { type: 'json_object' }`
  with the schema embedded in the system prompt.
- Env var renamed: `ANTHROPIC_API_KEY` → `GROQ_API_KEY`, plus optional
  `GROQ_BASE_URL` / `GROQ_MODEL` overrides for swapping providers.

**Controller, routes, frontend, ChatPanel — all unchanged.** Only the
service file changed because the exports kept the same surface.

---

## 5. Profile customisation

A creative customisation page with avatar upload, bio, goal, daily
study target, accent color, and dynamic achievement badges.

- **User model** extended with `avatar` (base64 data URL), `bio`,
  `goal`, `accentColor` (hex), `dailyStudyHours`.
- **`PATCH /api/profile`** with field-by-field validation (hex regex
  on color, 800 KB ceiling on avatar, length caps).
- **`pages/Profile.jsx`** — hero card with avatar over gradient cover,
  inline edit mode for name/bio/goal/hours/accent, color picker
  (8 presets + custom), stats showcase, **7 dynamic achievement badges**
  (Curator, Planner, Achiever, Centurion, On Fire, Sharp shot, Champion)
  computed from real data.
- **Client-side avatar resize** to 320×320 JPEG (~30–50 KB) before
  upload. No multer dependency yet; just base64 in MongoDB.
- **Sidebar** updated to show the actual avatar with a ring in the
  user's accent color (gradient initials fallback).

---

## 6. AI Tutor — dedicated study Q&A page

Distinct from Pulse:
- **Pulse** = in-app planning coach (slide-out, agentic, reads your data).
- **AI Tutor** = full-page study companion (Q&A, explanations, quizzes,
  flashcards, summaries, subject-aware context).

**Backend**
- `Conversation` model — `userId`, `title`, `subjectId?`, `messages[]`,
  timestamps. Embedded message schema for single-document reads.
- `controllers/tutorController.js` — list / get / patch / delete
  + `POST /api/tutor/chat` (SSE) that creates the conversation on
  first message and persists user+assistant turns.
- `aiService.tutorStream()` — no tools, longer max_tokens (4096),
  study-focused system prompt instructing markdown output (headers,
  lists, code fences, blockquotes, quiz/flashcard templates) and
  subject-context calibration.

**Frontend**
- `pages/Tutor.jsx` — full-bleed three-column layout: nav sidebar +
  conversations list (date-grouped Today / Yesterday / Last 7 days /
  Older) + chat area. Inline title rename, hover-delete, mobile drawer.
- **ChatGPT-style welcome state** with 6 starter prompt cards.
- **Quick-action chips** (Explain / Quiz / Summarize / Step by step /
  Flashcards) that template-fill the composer with the active subject.
- Streaming responses with typing dots, copy button on hover, blinking
  cursor.
- Subject selector in the header for context-aware answers.
- `ReactMarkdown` + `remark-gfm` rendering with full prose styling
  (custom code colors, blockquote callouts, dark code-fence theme).
- `@tailwindcss/typography` plugin added.

**Bug fix:** Mongoose pre-save hook signature crashed with "next is not
a function" on Mongoose 9.x. Replaced with the built-in
`{ timestamps: true }` option — cleaner and version-agnostic.

---

## 7. Hide AI tooling traces

The user wanted to submit to GitHub without revealing the work was done
with an assistant.

- Added `.claude/`, `.cursor/`, `.aider*`, `.codeium/` to `.gitignore`.
- Untracked `.claude/settings.local.json` from git.
- Removed 556 accidentally tracked root `node_modules` files in the same
  commit.
- Walked through the GitHub publishing workflow with explicit commands
  for: verifying scope, force-removing the staged `.claude/worktrees/...`
  gitlink (it was tracked as a submodule because the worktree has its
  own `.git`), and pushing only `main`.

---

## 8. Dark mode

Class-based dark mode with persistent toggle.

- `tailwind.config.js` → `darkMode: 'class'`.
- `ThemeContext.jsx` reads system preference on first load, persists to
  localStorage, sets `html.dark` class + `color-scheme` CSS property.
- `ThemeToggle.jsx` — animated pill switch with sun/moon icons inside a
  sliding thumb. Lives in the sidebar's new "Theme" section.
- `index.css` — every reusable utility (`.card`, `.input`, `.btn-*`,
  `.label`, `.section-title`, scrollbars, selection colors) ships with
  dark variants. **This single change covers ~70% of surfaces** because
  every page reuses these classes.
- Per-page touch-ups for inline `bg-white` / `text-slate-900` /
  status-pill colors, including the markdown prose in the Tutor page
  (`dark:prose-invert` + custom code/blockquote/heading overrides).

---

## 9. Three big features — Pomodoro, Notes/Flashcards, PDF chat

The largest single addition. Three independent features, three commits.

### 9a. Pomodoro timer with study-time tracking

**Backend**
- `StudySession` model — `userId`, `subjectId?`, `taskId?`, `duration`,
  `status`, `startedAt`, `endedAt`, `actualMinutes`.
- `sessionController` + routes:
  - `POST /api/sessions/start`
  - `PATCH /api/sessions/:id/complete`
  - `PATCH /api/sessions/:id/abandon`
  - `GET /api/sessions/active`
  - `GET /api/sessions/today`
  - `GET /api/sessions/stats` — today/week totals, per-subject,
    last-7-days.
- Only one active session per user at a time (auto-abandons priors).

**Frontend**
- `PomodoroContext.jsx` — state machine (idle/focus/break/longBreak),
  `endsAt`-based countdown that survives page refresh via localStorage,
  hydrates from server's active session, sound + browser notification
  on natural completion, every 4 rounds triggers a long break.
- `pages/Focus.jsx` — full-screen ring timer with subject + task picker,
  4 duration presets (15/25/50/90), today's stat tiles, per-subject
  breakdown, weekly bar chart.
- `PomodoroMiniWidget.jsx` — floating bottom-left card visible on every
  page during an active session: mini ring, time remaining, subject,
  pause/resume/stop.

### 9b. Notes + AI-generated flashcards

**Backend**
- `Note` model — `userId`, `subjectId`, `title`, `content` (markdown).
- `Flashcard` model — `userId`, `subjectId`, `noteId?`, `front`, `back`,
  plus SM-2 state (`interval`, `easeFactor`, `repetitions`, `dueAt`,
  `lastReviewedAt`).
- `notesController` — full CRUD with preview generation.
- `flashcardsController` — list / due / stats / create / bulk /
  generate / review / delete. Review endpoint runs simplified SM-2:
  Again resets to 10 min, Hard/Good/Easy step interval × ease.
- `aiService.generateFlashcards()` — JSON mode with a "one atomic fact
  per card" prompt and dynamic count (3–20).

**Frontend**
- `pages/Notes.jsx` — two-column layout: searchable list + markdown
  editor with Edit/Preview tabs, autosave debounced 800 ms, subject
  pill in header. "Generate flashcards" opens a slide-in panel:
  pick count (5/10/15/20), AI streams in cards, user edits inline,
  unchecks unwanted ones, bulk-saves.
- `pages/Review.jsx` — daily review session. Subject filter, due-count
  per subject, 3D flip-card animation, 4-button SRS rating (Again /
  Hard / Good / Easy with next-due hints), end-of-session summary.

### 9c. PDF upload + chat-with-your-notes (RAG-lite)

**Backend**
- `Document` model — `userId`, `subjectId?`, `filename`, `content`
  (extracted text, capped at 200 K chars, `truncated` flag when over).
- `documentsController` — multipart upload via `multer` (10 MB cap,
  PDF mimeType filter), `pdf-parse` extraction, JSON error responses,
  list/get/delete with ownership checks.
- `Conversation` model gets optional `documentId` reference.
- `aiService.tutorStream()` accepts `documentContext` and injects a
  bounded slice of the document text into the system prompt with
  instructions to prefer it over general knowledge for in-doc facts.

**Frontend**
- `services/documentsService.js` — upload (multipart, progress), list,
  get, delete.
- `pages/Tutor.jsx` — new "Attach PDF" pill in the chat header that:
  - opens a dropdown with "Upload new PDF" + existing documents
  - shows live upload progress (0–100 %)
  - highlights the active document, lets you switch/clear/delete
  - displays a gradient context badge above the composer when a
    document is attached, alongside the subject badge
  - passes `documentId` through to `/api/tutor/chat` so the LLM
    answers grounded in the PDF content.

**Bug fix:** `pdf-parse@2.x` changed its default export from a function
to an object, causing "pdfParse is not a function". Pinned to v1.1.1
and made the loader version-agnostic.

---

## 10. Flashcard management

The previous build had no UI to delete saved flashcards. Added a
**Study / Manage** tab toggle inside the Review page.

- **Backend:** `DELETE /api/flashcards/bulk` with body
  `{ subjectId?, noteId? }`. Refuses to delete without at least one
  filter (no "wipe everything" foot-gun).
- **Manage tab** features:
  - Full list of cards with inline edit (front/back fields swap in)
  - Per-card delete
  - Search filter
  - "Delete all in subject" action visible only when a subject is
    selected, with explicit confirmation

---

## Commit history

```
588cab1  Add flashcard management — edit, delete, bulk-delete by subject
f0e16ca  Fix PDF upload — pin pdf-parse to v1 and handle v2 shape too
28458a4  Add PDF upload + chat-with-your-notes (RAG-lite for the AI Tutor)
727ec9f  Add Notes + AI-generated Flashcards with SM-2 spaced repetition
346ac1e  Add Pomodoro timer with study-time tracking
9345c7e  Add dark mode with persistent toggle
a9021c7  Fix tutor save crash — use Mongoose timestamps instead of pre-save hook
740e0ea  Add AI Tutor: dedicated full-page study Q&A with persistent conversations
ac2eef0  Add profile customisation: avatar, bio, goal, accent color, achievements
11fb129  Untrack tooling files and add .claude/ to .gitignore
f718b7e  Remove NEW badges from Generate with AI and Ask Pulse buttons
9cadd70  Switch AI provider from Anthropic to Groq (free tier, no credit card)
aeb455c  Add AI features: smart plan, dashboard insights, streaming Pulse coach
19d8e92  Restructure project to spec + apply professional design system
6d36723  Initial commit
```

---

## Final feature surface

| Area              | Pages / Components                                         |
|-------------------|-------------------------------------------------------------|
| Core CRUD         | Dashboard, Subjects, Exams, Tasks, Progress, Profile        |
| Productivity      | Focus (Pomodoro) + floating mini-widget                     |
| Knowledge         | Notes (markdown editor + AI flashcard generator), Review     |
| AI                | Pulse (slide-out coach), AI Tutor (full-page Q&A with PDF)  |
| Theming           | Light / dark mode toggle, per-user accent color             |

## Final API surface

```
# Auth + Profile
POST   /api/auth/register             POST   /api/auth/login
GET    /api/auth/me
GET    /api/profile                   PATCH  /api/profile

# Core academic
GET    /api/subjects                  POST   /api/subjects
PUT    /api/subjects/:id              DELETE /api/subjects/:id
GET    /api/exams                     POST   /api/exams
PUT    /api/exams/:id                 DELETE /api/exams/:id
GET    /api/tasks                     POST   /api/tasks/generate    (rule)
PATCH  /api/tasks/:id/status          DELETE /api/tasks/:id
GET    /api/progress                  GET    /api/progress/summary

# AI
POST   /api/ai/plan/generate          GET    /api/ai/insights
POST   /api/ai/chat                   (SSE — Pulse, with tools)

# AI Tutor + Documents
GET    /api/tutor/conversations       GET    /api/tutor/conversations/:id
PATCH  /api/tutor/conversations/:id   DELETE /api/tutor/conversations/:id
POST   /api/tutor/chat                (SSE — Tutor, optional PDF context)
POST   /api/documents                 (multipart PDF upload + extract)
GET    /api/documents                 GET    /api/documents/:id
DELETE /api/documents/:id

# Pomodoro
POST   /api/sessions/start
PATCH  /api/sessions/:id/complete     PATCH  /api/sessions/:id/abandon
GET    /api/sessions/active           GET    /api/sessions/today
GET    /api/sessions/stats

# Notes + Flashcards
GET    /api/notes                     GET    /api/notes/:id
POST   /api/notes                     PATCH  /api/notes/:id
DELETE /api/notes/:id

GET    /api/flashcards                GET    /api/flashcards/due
GET    /api/flashcards/stats          POST   /api/flashcards
POST   /api/flashcards/bulk           POST   /api/flashcards/generate
PATCH  /api/flashcards/:id            POST   /api/flashcards/:id/review
DELETE /api/flashcards/bulk           DELETE /api/flashcards/:id
```

## Tech stack

| Layer          | Tools                                                         |
|----------------|---------------------------------------------------------------|
| Frontend       | React 19, Vite, React Router 7, Tailwind 3, Axios, Recharts   |
| Markdown       | react-markdown + remark-gfm + @tailwindcss/typography          |
| Backend        | Node 20 + Express 5, Mongoose 9, JWT, bcryptjs, dotenv, cors  |
| Files          | multer (uploads), pdf-parse 1.1.1 (text extraction)           |
| AI             | OpenAI SDK pointed at Groq (Llama 3.3 70B), free tier         |
| Database       | MongoDB Atlas (production) / mongodb://localhost (dev)        |

## Environment variables

`server/.env`:
```
MONGO_URI=mongodb://localhost:27017/studyplanner
JWT_SECRET=any_long_random_string
PORT=5000
GROQ_API_KEY=gsk_...
# Optional:
# GROQ_BASE_URL=https://api.groq.com/openai/v1
# GROQ_MODEL=llama-3.3-70b-versatile
```

`client/.env`:
```
VITE_API_URL=http://localhost:5000
```

---

## What's next (not built, but suggested)

- Real calendar view with drag-and-drop task rescheduling
- Voice mode for the AI Tutor (browser SpeechRecognition / Synthesis)
- AI-graded quizzes with score history per subject
- Recurring tasks
- XP / levels system
- Email digest (nightly cron + nodemailer)
- AI handwriting OCR via Groq vision-capable models
- Study groups / friend system

---

Built across one long session. The final app is a substantial MERN +
AI project that goes well beyond the original 8-week DevCore spec.
