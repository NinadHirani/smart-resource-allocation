# Smart Resource Allocation

Smart Resource Allocation is a full-stack prototype for NGOs to collect field need reports, prioritize them with Gemini, create response tasks, and match volunteers using AI-assisted recommendations.

## Stack

- Frontend: React + Vite + React Router + Chart.js
- Backend: Node.js + Express
- Database: PostgreSQL
- AI: Google Gemini
- Email: Nodemailer with Gmail SMTP

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

## Main Flows

- Admin registration creates an organization and public `org_code`
- Field agents submit need reports at `/report/:orgCode`
- Admin reviews reports, rescoring and converting reports into tasks
- Admin requests Gemini volunteer suggestions and assigns volunteers
- Volunteers update their profile, see assignments, and mark work completed
- Admin analytics shows category trends, task breakdowns, and a text-based needs heatmap

## Notes

- Gemini and email delivery require valid environment variables to work end-to-end.
- If Gemini fails, urgency scoring falls back to a pending state and matching falls back to a basic rule-based scorer.
- The Google Maps panel on report details uses an embed query generated from the stored location text.
