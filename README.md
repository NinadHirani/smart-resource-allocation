# Smart Resource Allocation

Smart Resource Allocation is a full-stack prototype for NGOs to collect field need reports, prioritize them with Gemini, create response tasks, and match volunteers using AI-assisted recommendations.

## Live Demo

- Frontend: `https://smart-resource-ninad-2026.web.app`
- Backend API: `https://smart-resource-allocation-api.vercel.app`
- GitHub Repository: `https://github.com/NinadHirani/smart-resource-allocation`

## Stack

- Frontend: React + Vite + React Router + Chart.js
- Backend: Node.js + Express
- Database: PostgreSQL (Supabase)
- AI: Google Gemini
- Email: Nodemailer with Gmail SMTP

## Deployment

- Frontend hosted on Firebase Hosting
- Backend hosted on Vercel
- PostgreSQL hosted on Supabase
- Production frontend talks to the live backend using `VITE_API_BASE_URL`
- Backend uses Vercel environment variables for DB, JWT, Gemini, and Gmail SMTP

## Project Structure

- `backend/`: Express API, migrations, Gemini integration, email service
- `frontend/`: React SPA for admin, volunteer, and public field-report flows
- `docker-compose.yml`: Local Postgres + backend + frontend setup

## Local Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in real credentials.
2. Copy `frontend/.env.example` to `frontend/.env` if you want to override the default API base URL.
3. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
4. Run the backend migration:
   - `cd backend && npm run migrate`
5. Start both apps:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`

## Production Environment Variables

Backend:
- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `FRONTEND_URL`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Frontend:
- `VITE_API_BASE_URL`

## Main Flows

- Admin registration creates an organization and public `org_code`
- Field agents submit need reports at `/report/:orgCode`
- Admin reviews reports, rescoring and converting reports into tasks
- Admin requests Gemini volunteer suggestions and assigns volunteers
- Volunteers update their profile, see assignments, and mark work completed
- Admin analytics shows category trends, task breakdowns, and a text-based needs heatmap

## Hackathon Demo Flow

1. Register an admin account from the live frontend.
2. Copy the generated `org_code`.
3. Open `/report/:orgCode` and submit a field need report.
4. Review the report from the admin dashboard.
5. Create a task from the report.
6. Register a volunteer account and complete the volunteer profile.
7. Run AI matching and assign the volunteer.
8. Verify the assignment appears in the volunteer dashboard and that an email is sent.

## Notes

- Gemini and email delivery require valid environment variables to work end-to-end.
- If Gemini fails, urgency scoring falls back to a pending state and matching falls back to a basic rule-based scorer.
- The Google Maps panel on report details uses an embed query generated from the stored location text.
- The backend exposes a health endpoint at `/health`.
