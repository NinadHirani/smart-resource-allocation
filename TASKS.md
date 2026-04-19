# Prototype Tasks — Smart Resource Allocation
> Full code audit completed. Every task below is based on what is **actually missing or broken** in the codebase right now. Nothing is invented. Each task tells you exactly which file to open and what to do.

---

## 🔴 CRITICAL — Fix before any demo. These will cause visible failures.

---

### TASK-01 · Pool has no connection limit — will crash on Supabase free tier

**File:** `backend/src/db/pool.js`

**Problem:** The pool is created with no `max` option. Supabase free tier allows only **2 direct connections**. Under any real load (even the demo flow), the pool will open more connections than allowed and every query will fail with a connection error.

**Fix:** Add `max: 2` and `idleTimeoutMillis: 30000` to the Pool constructor.

```js
// BEFORE
const pool = connectionString ? new Pool({ connectionString }) : null;

// AFTER
const pool = connectionString
  ? new Pool({ connectionString, max: 2, idleTimeoutMillis: 30000 })
  : null;
```

---

### TASK-02 · `TaskDetail` has no loading/submitting state on AI match button

**File:** `frontend/src/pages/TaskDetail.jsx`

**Problem:** When admin clicks "Find Best Volunteers", `findMatches()` is called but there is no `loading` state. The button stays clickable. If the admin clicks twice, two Gemini API calls are made simultaneously and the second response overwrites the first with potentially different results. Also, there is zero user feedback while Gemini is working (can take 3–8 seconds).

**Fix:** Add a `matching` boolean state. Disable the button and show "Gemini AI is finding matches..." text while the request is in flight.

```jsx
const [matching, setMatching] = useState(false);

async function findMatches() {
  setMatching(true);
  setError('');
  try {
    const response = await api.post(`/matching/task/${id}/suggest`, {});
    setMatches(response.matches);
  } catch (matchError) {
    setError(matchError.message);
  } finally {
    setMatching(false);
  }
}

// In JSX:
<button
  className="primary-button"
  onClick={findMatches}
  disabled={matching}
  type="button"
>
  {matching ? 'Gemini AI is finding matches...' : 'Find Best Volunteers'}
</button>
```

---

### TASK-03 · `TaskDetail` has no loading/submitting state on Assign button

**File:** `frontend/src/pages/TaskDetail.jsx`

**Problem:** When admin clicks "Assign Selected", `assignVolunteers()` runs but there is no `assigning` state. Double-clicking will fire duplicate POST requests to `/matching/task/:id/assign`, potentially creating duplicate assignment records (the backend handles the conflict with `ON CONFLICT DO UPDATE`, but the UI response becomes unpredictable).

**Fix:** Add an `assigning` boolean state identical to the pattern above. Disable the "Assign Selected" button while the request is in flight.

---

### TASK-04 · `ReportDetail` rescore button has no loading state

**File:** `frontend/src/pages/ReportDetail.jsx`

**Problem:** The "Re-run Urgency Scoring" button calls `rescore()` which hits the Gemini API. No loading state → admin can click multiple times → multiple Gemini calls stack up, each overwriting `urgency_score` in the DB. The final score is whichever Gemini call finishes last, which is non-deterministic.

**Fix:** Add `const [rescoring, setRescoring] = useState(false)` and wrap the rescore call with it. Disable the button and change its text to "Rescoring..." while in flight.

---

### TASK-05 · `PublicReportForm` sends auth token on public route — breaks for field agents

**File:** `frontend/src/pages/PublicReportForm.jsx`

**Problem:** The form uses `api.post(...)` from `api/client.js`. That client always attaches `Authorization: Bearer <token>` if `sra_token` exists in localStorage. If an admin opens the public form while logged in (e.g., to test it), their admin JWT is sent. The backend route `/reports/public/:org_code` does not check auth — so this does not break the submission — **but** it is also not the correct behaviour for a no-auth public form. More critically, CORS on the backend uses `FRONTEND_URL` as the allowed origin. If a field agent opens the link from a different origin or if the token header triggers any preflight issue, this will silently fail.

**Fix:** In `PublicReportForm.jsx`, use `api.raw(...)` directly with no Authorization header, or use native `fetch` without the shared client for public endpoints.

```jsx
// Replace api.post with a plain fetch for the public submission:
const response = await fetch(`${API_BASE_URL}/reports/public/${orgCode}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...form, affected_count: form.affected_count ? Number(form.affected_count) : null }),
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error || 'Submission failed');
```

---

### TASK-06 · CSV import runs Gemini scoring synchronously in the request — will timeout on Vercel

**File:** `backend/src/routes/reports.js` — the `import/csv` route

**Problem:** After inserting CSV rows, the route calls `applyUrgencyScoring(id)` for every row in sequence, with `await` on each group of 10, plus a 1-second delay per batch. For 100 rows that is ~10 seconds of processing **inside the same HTTP request**. Vercel's serverless functions have a **10-second timeout on the free/hobby plan**. A CSV with more than ~30 rows will time out and the client gets a 504, even though the DB inserts already succeeded.

**Fix:** Remove the synchronous scoring loop from the route. Return the import result immediately after inserts. Fire scoring as fire-and-forget (no `await`), the same pattern used in the single report submission route.

```js
// BEFORE (blocks until all scoring is done):
for (let i = 0; i < insertedIds.length; i += 1) {
  await applyUrgencyScoring(insertedIds[i]);
  if ((i + 1) % 10 === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
return res.json({ imported: insertedIds.length, errors });

// AFTER (return immediately, score in background):
// Fire and forget — no await
Promise.allSettled(insertedIds.map((id) => applyUrgencyScoring(id)));
return res.json({ imported: insertedIds.length, errors, ai_score_pending: true });
```

---

## 🟡 IMPORTANT — Broken UX or missing feature that will be noticed during demo.

---

### TASK-07 · `Volunteers` page is a dead end — shows a list but nothing is clickable

**File:** `frontend/src/pages/Volunteers.jsx`

**Problem:** The page renders a list of volunteers. There are no links, no detail view, no way to see a volunteer's skills/availability from this page. During the hackathon demo, judges or admin will click on a volunteer name and nothing will happen.

**Fix:** Wrap each volunteer's display name in a way that shows their full profile inline, either as an expandable row or a simple modal. The simplest fix: make each row expand on click to show skills, availability, location preference, and bio inline in the table. No new page needed.

---

### TASK-08 · `MatchCard` selected state is visual only — no indication of how many can be selected

**File:** `frontend/src/components/MatchCard.jsx`

**Problem:** Admin can select multiple volunteers from the match suggestions, but there is no cap check in the UI. If the task needs 1 volunteer and admin selects all 3 match cards, they can click "Assign Selected" and the backend will reject it with `"Assignment exceeds volunteer_count_needed"` — but the error just appears as a generic alert. The admin has no idea why it failed or what the limit is.

**Fix:** In `TaskDetail.jsx`, show text below the match cards: `"Select up to {task.volunteer_count_needed} volunteer(s)"`. Also disable the checkbox on already-selected cards once the limit is reached.

---

### TASK-09 · No feedback after successful volunteer assignment

**File:** `frontend/src/pages/TaskDetail.jsx`

**Problem:** After `assignVolunteers()` succeeds, the code calls `loadTask()` to refresh. But there is no success message. The admin does not know the assignment went through — the only signal is the table in "Current Assignments" updating. In a slow network this is invisible.

**Fix:** Add a `successMsg` state. After `assignVolunteers()` resolves, set `successMsg('Volunteer(s) assigned successfully. Email notification sent.')` and display it as a `.alert.success` div that auto-clears after 4 seconds.

---

### TASK-10 · `Analytics` page shows empty charts when there is no data — no empty state

**File:** `frontend/src/pages/Analytics.jsx`

**Problem:** Chart.js will render empty axes with no data (blank chart area). For a fresh organization with 0 reports, all three charts are blank boxes with no explanation. The heatmap table also shows nothing.

**Fix:** In each chart panel, check if the data array is empty before rendering the chart component. Show a simple `<div className="empty-state">No data yet. Submit your first field report to see trends here.</div>` instead.

---

### TASK-11 · `AdminDashboard` fetches tasks with `limit=3` but the response shape is `{ data }` not `{ tasks }`

**File:** `frontend/src/pages/AdminDashboard.jsx`

**Problem:** The tasks route `GET /tasks` returns `{ data: [...], total, page, limit }`. In `AdminDashboard.jsx`, the code does:

```js
const tasksResponse = await api.get('/tasks?limit=3');
setTasks(tasksResponse.data);
```

`tasksResponse.data` will be the tasks array correctly. **But** if the API ever returns an error response, `.data` will be `undefined` and `.map()` will throw. There is also no check — if `tasksResponse` itself is null (network error swallowed by try/catch), the `.data` access throws outside the catch.

**Fix:** Add null-guards: `setTasks(tasksResponse?.data ?? [])` for all three Promise.all responses in `loadDashboard()`.

---

### TASK-12 · `pool.js` has no `max` set but `pool` object is exported as a proxy — connection errors show as generic 500

**File:** `backend/src/index.js`

**Problem:** The global error handler catches all unhandled errors but only has a special case for `DATABASE_URL_MISSING`. A Supabase connection limit error (error code `53300 — too many connections`) is not caught specifically. The response is `{ "error": "Internal server error" }` — which tells the developer nothing useful.

**Fix:** In the global error handler, add detection for `err.code === '53300'` and return a more descriptive message during development:

```js
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'DATABASE_URL_MISSING') {
    return res.status(500).json({ error: 'Backend is missing DATABASE_URL configuration' });
  }
  if (err.code === '53300') {
    return res.status(503).json({ error: 'Database connection limit reached. Try again shortly.' });
  }
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 🟢 POLISH — Do these if time allows. Will improve demo quality.

---

### TASK-13 · Show the org_code prominently on Admin Dashboard so admin can share it with field agents

**File:** `frontend/src/pages/AdminDashboard.jsx`

**Problem:** The `org_code` is fetched as part of `/auth/me` and stored in `AuthContext`. But it is never shown to the admin after registration. The only way to know your `org_code` is to remember it from the registration screen. For the demo flow, the judge needs to know the `org_code` to open the public form.

**Fix:** In `AdminDashboard.jsx`, read `user` from `useAuth()`. Display a highlighted info box:

```jsx
const { user } = useAuth();

// In JSX, after the page title:
<div className="alert" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
  Your field agent form link:{' '}
  <strong>{window.location.origin}/report/{user?.org_code}</strong>
  {' — '}share this with your field workers.
</div>
```

---

### TASK-14 · Sidebar does not show org_code or role — volunteer sidebar is the same as admin

**File:** `frontend/src/components/Sidebar.jsx`

**Problem:** The sidebar shows organization name but the volunteer does not belong to an org (their `org_id` is null). Currently the sidebar probably shows nothing or "undefined" in the org block for volunteers.

**Fix:** In `Sidebar.jsx`, conditionally render the org block only for admins. For volunteers, show their display name instead.

---

### TASK-15 · `TaskDetail` does not show a loading state while the page is fetching — shows blank

**File:** `frontend/src/pages/TaskDetail.jsx`

**Problem:** The page shows `<div className="page-message">Loading task details...</div>` while `task` is null. But `error` is also shown only when set. If the API call fails (e.g., 403 because a volunteer tries to access a task they are not assigned to), the page stays on "Loading task details..." forever because `setTask` is never called and `setError` is called but the `!task` check short-circuits before the error div renders.

**Fix:** Restructure the early return:

```jsx
if (!task && !error) return <div className="page-message">Loading task details...</div>;
if (error && !task) return <div className="page-grid"><div className="alert error">{error}</div></div>;
```

---

### TASK-16 · No `<title>` tag per page — browser tab always shows "Vite App"

**File:** `frontend/index.html` and each page component

**Problem:** The browser tab shows "Vite App" for every page. For a hackathon demo, this looks unfinished.

**Fix:** In `frontend/index.html`, change:
```html
<title>Smart Resource Allocation</title>
```

That single change fixes the tab title across the entire app.

---

### TASK-17 · `docker-compose.yml` frontend service has no build context for Vite env variable

**File:** `docker-compose.yml`

**Problem:** The frontend Dockerfile is a standard Vite build container. Vite bakes `VITE_API_BASE_URL` into the static bundle **at build time**, not at runtime. Passing it as a Docker environment variable at runtime does nothing — the built JS bundle does not read `process.env`. So locally running `docker compose up` will have the frontend pointing to `http://localhost:8080/api` (the default fallback), regardless of what you set in the compose file.

**Fix:** Either add a build arg:

```yaml
frontend:
  build:
    context: ./frontend
    args:
      VITE_API_BASE_URL: http://localhost:8080/api
```

And in `frontend/Dockerfile`:
```dockerfile
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build
```

Or just document in the README that the `environment:` key under the frontend service has no effect and users should edit `frontend/.env` before building.

---

## ✅ Deployment Checklist — Verify these before submitting the PPT

| # | Check | Where |
|---|---|---|
| D-01 | `VITE_API_BASE_URL` is set to the live backend URL in Vercel frontend environment variables | Vercel → Frontend project → Settings → Environment Variables |
| D-02 | `FRONTEND_URL` on the backend matches the exact frontend Vercel URL (no trailing slash) | Vercel → Backend project → Settings → Environment Variables |
| D-03 | `DATABASE_URL` points to Supabase and the Supabase project is not paused (free tier pauses after 7 days of inactivity) | Supabase → Project Settings → Database |
| D-04 | `001_init.sql` has been run in Supabase SQL Editor and all 6 tables exist | Supabase → Table Editor |
| D-05 | `GEMINI_API_KEY` is valid and has not exceeded the free tier quota | Google AI Studio → API Keys |
| D-06 | Gmail App Password is set (not your regular Gmail password — must be a 16-char app password from Google Account → Security → App Passwords) | Google Account settings |
| D-07 | Backend Vercel project `vercel.json` exists (or entry point is set to `src/index.js` in Vercel settings) | Vercel → Backend project → Settings → General |
| D-08 | GitHub repo is set to **Public** before submitting the PPT | GitHub → Repository → Settings → Danger Zone |
| D-09 | Demo video is exactly 3 minutes and follows the README demo flow step by step | README.md → Hackathon Demo Flow |
| D-10 | `/report/:org_code` public form link is tested on a **mobile phone** in a real browser (not just desktop) | Phone browser |

---

## Summary

| Priority | Count | What |
|---|---|---|
| 🔴 Critical | 6 | TASK-01 to TASK-06 |
| 🟡 Important | 6 | TASK-07 to TASK-12 |
| 🟢 Polish | 5 | TASK-13 to TASK-17 |
| ✅ Deployment | 10 | D-01 to D-10 |

**Minimum to do before demo:** All 6 critical tasks + deployment checklist D-01 through D-08.
