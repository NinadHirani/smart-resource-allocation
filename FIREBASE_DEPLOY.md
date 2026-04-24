# Deploy Frontend to Firebase Hosting
> Goal: get a live `https://your-app.web.app` URL so you can answer **Yes** for Google Cloud deployment in the hackathon form.
> Time needed: about 20 to 30 minutes.
> This does **not** replace or break your current Vercel deployment.

---

## What this project already uses

This repo is already set up as:
- Frontend: React + Vite
- Backend API: `https://smart-resource-allocation-api.vercel.app`
- Existing frontend: `https://smart-resource-allocation-seven.vercel.app`
- GitHub repo: `https://github.com/NinadHirani/smart-resource-allocation`

For Firebase, you are only deploying the `frontend/` Vite app as static hosting.

---

## Prerequisites

You need:
- Node.js installed
- npm installed
- A Google account
- Your backend URL:

```text
https://smart-resource-allocation-api.vercel.app/api
```

Keep that URL exactly, including `/api`.

---

## Step 1 - Install Firebase CLI

Run:

```bash
npm install -g firebase-tools
```

Verify:

```bash
firebase --version
```

If it prints a version, you are good.

---

## Step 2 - Login to Firebase

Run:

```bash
firebase login
```

A browser window will open. Sign in with your Google account, then return to the terminal.

---

## Step 3 - Set the production API URL for the frontend build

Create or update `frontend/.env` with:

```env
VITE_API_BASE_URL=https://smart-resource-allocation-api.vercel.app/api
```

Why this matters:
- this frontend uses Vite
- Vite bakes `VITE_API_BASE_URL` into the production build
- if this value is wrong, Firebase will load the UI but all API requests will fail

---

## Step 4 - Install frontend dependencies if needed

From the project root:

```bash
cd frontend
npm install
```

If `node_modules` is already there, this is still safe.

---

## Step 5 - Build the frontend

Still inside `frontend/`, run:

```bash
npm run build
```

Expected result:
- build succeeds
- a `frontend/dist/` folder is created

This project uses Vite, so `dist` is the correct Firebase public directory.

---

## Step 6 - Initialize Firebase Hosting

Inside the `frontend/` folder, run:

```bash
firebase init hosting
```

When prompted, use these answers:

```text
? Please select an option:
  Use an existing project
  Create a new project
→ Create a new project

? Please specify a unique project ID:
→ smart-resource-allocation-ninad
```

If that ID is taken, use any unique version such as:

```text
smart-resource-allocation-2026
smart-resource-allocation-ninad-2026
smart-resource-allocation-hackathon
```

Continue with:

```text
? What do you want to use as your public directory?
→ dist

? Configure as a single-page app (rewrite all urls to /index.html)?
→ Yes

? Set up automatic builds and deploys with GitHub?
→ No

? File dist/index.html already exists. Overwrite?
→ No
```

This will create:
- `frontend/firebase.json`
- `frontend/.firebaserc`

Do not delete those files.

---

## Step 7 - Deploy to Firebase

Still inside `frontend/`, run:

```bash
firebase deploy
```

At the end, Firebase will print something like:

```text
Deploy complete!
Hosting URL: https://smart-resource-allocation-ninad.web.app
```

Copy that `Hosting URL`. That is your Google Cloud deployment link for the hackathon.

---

## Step 8 - Test the live Firebase site

Open your new Firebase URL and test:
- homepage loads
- admin registration works
- login works
- dashboard loads
- public report form route works:

```text
https://your-firebase-project.web.app/report/YOUR_ORG_CODE
```

Also test on mobile if possible, because hackathon judges often open links on phones.

---

## Important note about CORS

Right now, the backend code in [backend/src/index.js](/Users/ninadhirani/Desktop/Google project/backend/src/index.js:1) allows a single frontend origin using `FRONTEND_URL`.

That means:
- your existing Vercel frontend should keep working
- your new Firebase frontend may need backend CORS to also allow the Firebase domain

If the Firebase UI opens but API requests fail with CORS errors, update backend CORS to allow both origins, then redeploy the backend.

Current backend behavior is based on:

```js
const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();

app.use(
  cors({
    origin: frontendOrigin,
  })
);
```

If you want both Vercel and Firebase to work, use this pattern in `backend/src/index.js`:

```js
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_FIREBASE,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  })
);
```

Then add this in your backend hosting environment variables:

```env
FRONTEND_URL_FIREBASE=https://your-firebase-project.web.app
```

Replace it with your actual Firebase Hosting URL.

If your hackathon only needs the Firebase URL for submission and the app already works end-to-end there, you do not need to change anything else.

---

## Hackathon submission values

Use these values in the form:

| Field | Value |
|---|---|
| Have you deployed on Google Cloud? | `Yes` |
| MVP Link | your Firebase Hosting URL |
| Working Prototype Link | your Firebase Hosting URL |
| GitHub Repository | `https://github.com/NinadHirani/smart-resource-allocation` |
| Backend API | `https://smart-resource-allocation-api.vercel.app` |
| Demo Video | your video link |

For the AI model field, check what you submitted elsewhere and keep it consistent with your backend Gemini integration.

---

## Full command list

Run these in order:

```bash
npm install -g firebase-tools
firebase login
cd frontend
npm install
npm run build
firebase init hosting
firebase deploy
```

And make sure `frontend/.env` contains:

```env
VITE_API_BASE_URL=https://smart-resource-allocation-api.vercel.app/api
```

---

## Quick fallback if something goes wrong

If build fails:

```bash
cd frontend
npm install
npm run build
```

If Firebase says project ID is taken:
- change the project ID to something unique

If the site loads but API calls fail:
- check `frontend/.env`
- rebuild with `npm run build`
- redeploy with `firebase deploy`
- if needed, allow the Firebase domain in backend CORS

---

## Final result

After this, you will have:
- a Google-hosted frontend URL ending in `.web.app`
- a valid answer of **Yes** for Google Cloud deployment
- the same backend and repo setup unchanged
