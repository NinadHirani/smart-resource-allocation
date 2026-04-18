# Software Requirements Specification (SRS)

## Project: Smart Resource Allocation — Data-Driven Volunteer Coordination for Social Impact

**Version:** 1.0  
**Date:** April 2026  
**Competition:** GDSC Solution Challenge 2026 — Build with AI  
**Status:** Final Draft for Development

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Database Schema](#6-database-schema)
7. [API Specification](#7-api-specification)
8. [UI/UX Pages and Screens](#8-uiux-pages-and-screens)
9. [Technology Stack](#9-technology-stack)
10. [Google AI Integration (Gemini)](#10-google-ai-integration-gemini)
11. [Deployment Plan (Google Cloud)](#11-deployment-plan-google-cloud)
12. [User Roles and Permissions](#12-user-roles-and-permissions)
13. [Constraints and Assumptions](#13-constraints-and-assumptions)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Introduction

### 1.1 Purpose

This document is the complete Software Requirements Specification for **Smart Resource Allocation**, a web application that helps NGOs and local social groups collect community need data from scattered sources (paper surveys, field reports, Google Forms), visualize the most urgent needs on a dashboard, and automatically match available volunteers to the right tasks and locations using Google Gemini AI.

This SRS is written to be directly consumed by an AI coding assistant (e.g., GitHub Copilot, Cursor, or Claude) to generate a fully working, deployable codebase. Every section is precise and unambiguous.

### 1.2 Scope

The system has three user types:
- **Admin (NGO Staff):** Manages the organization, creates tasks, uploads/imports need reports, views analytics.
- **Volunteer:** Registers, sets availability and skills, gets matched to tasks, accepts or declines.
- **Field Agent:** Submits community need reports via a simple mobile-friendly form.

### 1.3 Problem Being Solved

Local NGOs collect community need data through paper surveys, WhatsApp messages, Google Forms, and field visits. This data is never aggregated. As a result:
- Staff cannot see which areas or needs are most urgent.
- Volunteers are assigned manually and inefficiently.
- Critical needs are missed due to information overload.

This system solves both problems: centralized data aggregation with an urgency dashboard, and AI-powered volunteer-task matching.

### 1.4 Glossary

| Term | Meaning |
|---|---|
| Need Report | A structured record of a community problem submitted by a field agent or admin |
| Task | An actionable unit of work created by admin to address a need |
| Match | An AI-generated recommendation pairing a volunteer to a task |
| Urgency Score | A numerical score (1–10) assigned by Gemini AI to each need report |
| NGO | Non-Governmental Organization |

---

## 2. Overall Description

### 2.1 Product Perspective

A single-page web application with:
- A **React** frontend (Vite-based, not Next.js — simpler to deploy)
- A **Node.js + Express** REST API backend
- A **PostgreSQL** database (hosted on Supabase free tier)
- **Google Gemini API** for urgency scoring and volunteer matching
- Deployed on **Google Cloud Run** (free tier friendly, no infra knowledge needed)

### 2.2 Product Functions Summary

1. Field agents submit need reports via a form (no login required, just an org code).
2. Admin sees all need reports on a dashboard, sorted by AI-generated urgency score.
3. Admin creates tasks from need reports.
4. Volunteers register and fill their skill/availability profile.
5. Admin clicks "Find Best Match" on a task — Gemini AI returns top volunteer suggestions with reasoning.
6. Admin confirms a match; volunteer gets notified by email.
7. Volunteer marks task as completed.
8. Admin sees completion metrics and need fulfillment charts.

### 2.3 User Classes

| User | Technical Level | Access Method |
|---|---|---|
| Admin | Non-technical NGO staff | Web browser (desktop) |
| Volunteer | General public | Web browser (mobile + desktop) |
| Field Agent | Non-technical, field worker | Mobile browser (form only) |

---

## 3. Functional Requirements

Each requirement has an ID, description, and acceptance criteria.

---

### Module 1: Authentication

**FR-AUTH-01: Admin Registration**
- Admin can register with: organization name, email, password.
- System creates an organization record and assigns a unique 6-character `org_code`.
- Password is hashed using `bcrypt` before storing.
- Acceptance: After registration, admin is redirected to their dashboard.

**FR-AUTH-02: Admin Login**
- Admin logs in with email + password.
- On success, a JWT token (expires in 7 days) is returned and stored in `localStorage`.
- On failure, show error: "Invalid email or password."
- Acceptance: JWT is sent as `Authorization: Bearer <token>` header on all subsequent API calls.

**FR-AUTH-03: Volunteer Registration**
- Volunteer registers with: name, email, password, phone (optional).
- After registration, volunteer is prompted to complete their profile (skills, availability).
- Acceptance: Volunteer profile page is shown after registration.

**FR-AUTH-04: Volunteer Login**
- Same as admin login flow. Role is encoded in JWT payload as `role: "volunteer"`.

**FR-AUTH-05: Field Agent Access (No Login)**
- Field agents access a public form via URL: `/report/:org_code`
- No authentication needed. `org_code` links the report to the correct organization.
- Acceptance: Submitting the form stores the report with the correct `org_id`.

---

### Module 2: Need Report Submission and Management

**FR-NEED-01: Field Agent Submits Need Report**

The public form at `/report/:org_code` collects:
- `reporter_name` (text, required)
- `reporter_phone` (text, optional)
- `location` (text field: village/area name, required)
- `category` (dropdown: Food, Medical, Education, Shelter, Water, Sanitation, Employment, Other)
- `description` (textarea, required, min 20 characters)
- `severity_self_reported` (radio: Low / Medium / High)
- `affected_count` (number: approximate number of people affected, optional)
- `submitted_at` (auto-filled by system, UTC timestamp)

On submit:
1. Record is saved to `need_reports` table with `status = "pending_review"`.
2. A background job calls Gemini API to compute `urgency_score` (1–10) and `urgency_reason` (short text).
3. Form shows success message: "Your report has been submitted. Thank you."

**FR-NEED-02: Admin Views Need Reports Dashboard**

Admin sees a table/card list of all need reports for their organization.

Columns shown: Location, Category, Description (truncated), Severity (self-reported), Urgency Score (AI), Affected Count, Date, Status, Actions.

Filters available:
- By category (multi-select dropdown)
- By status (Pending Review / Reviewed / Task Created / Resolved)
- By urgency score (slider: 1–10)
- By date range (from/to date pickers)

Default sort: urgency score descending.

Acceptance: Changing filters immediately updates the displayed list (no page reload).

**FR-NEED-03: Admin Reviews a Need Report**

Admin clicks a need report to open a detail modal/page showing:
- Full description
- AI urgency score and Gemini's reason for the score
- Location on a Google Maps embed (geocoded from location text)
- Option to change status to "Reviewed"
- Button: "Create Task from this Report"

**FR-NEED-04: Admin Imports Need Reports via CSV**

Admin can upload a CSV file with columns matching the need report form fields.
System parses CSV, validates each row, and batch-inserts valid records.
Invalid rows are shown in an error summary (row number + reason).
After import, Gemini urgency scoring runs for each new record.

CSV template is downloadable from the UI.

---

### Module 3: Task Management

**FR-TASK-01: Admin Creates a Task**

From a need report detail view, admin clicks "Create Task." A form pre-fills with:
- `title` (text, editable)
- `description` (text, editable, pre-filled from need report description)
- `location` (text, pre-filled)
- `category` (dropdown, pre-filled from need report category)
- `required_skills` (multi-select tag input: e.g., First Aid, Teaching, Driving, Counseling, Construction, Cooking, Data Entry, Communication, Medical, Other)
- `volunteer_count_needed` (number, default 1)
- `deadline` (date picker)
- `status` (auto-set to "open")

On save:
- Task is stored in `tasks` table.
- `need_report_id` FK links it to the originating report.
- Need report status is updated to "task_created".

**FR-TASK-02: Admin Views All Tasks**

Tasks list page shows: Title, Category, Location, Deadline, Volunteers Needed, Volunteers Assigned, Status.

Status values: open, in_progress, completed, cancelled.

Filters: by status, by category, by deadline range.

**FR-TASK-03: Admin Closes / Cancels a Task**

Admin can mark a task as "completed" or "cancelled" from the task detail page.
On "completed," system records `completed_at` timestamp.

---

### Module 4: Volunteer Profile

**FR-VOL-01: Volunteer Completes Profile**

After registration, volunteer fills:
- `display_name` (text)
- `skills` (multi-select from same list as task required_skills)
- `availability` (checkboxes: Weekday Mornings, Weekday Afternoons, Weekday Evenings, Weekends)
- `location_preference` (text: area/city they can travel to)
- `bio` (textarea, optional, max 300 chars)
- `is_available` (toggle: currently available for new tasks)

**FR-VOL-02: Volunteer Views Their Matched Tasks**

After login, volunteer sees "My Tasks" — a list of tasks they have been assigned (status: accepted).
Each task shows: title, location, deadline, description, status.
Volunteer can click "Mark as Completed" on an in-progress task.

**FR-VOL-03: Volunteer Receives Email Notification on Assignment**

When admin confirms a volunteer-task match, system sends an email to the volunteer with:
- Task title, description, location, deadline
- Admin contact email
- A link to the volunteer's task dashboard

Email is sent via **Nodemailer** using a Gmail SMTP account (configured via environment variables).

---

### Module 5: AI-Powered Matching (Gemini Integration)

**FR-AI-01: Urgency Scoring of Need Reports**

Trigger: A new need report is saved (from form submission or CSV import).

System calls Gemini API with this prompt structure:

```
You are an expert at evaluating community welfare need reports for NGOs.

Given the following need report, assign an urgency score from 1 to 10 (10 = most urgent) 
and provide a one-sentence reason.

Report:
- Category: {category}
- Description: {description}
- Self-reported severity: {severity_self_reported}
- Estimated people affected: {affected_count}

Respond ONLY in this exact JSON format:
{
  "urgency_score": <number 1-10>,
  "urgency_reason": "<one sentence>"
}
```

The response is parsed and stored in `need_reports.urgency_score` and `need_reports.urgency_reason`.

If Gemini API call fails, `urgency_score` is set to `null` and retried once. If still failing, admin sees "Score Pending" badge.

**FR-AI-02: Volunteer-Task Matching**

Trigger: Admin clicks "Find Best Volunteers" on a task detail page.

System fetches all volunteers where `is_available = true` and formats them as a JSON array.

System calls Gemini API with this prompt:

```
You are an expert volunteer coordinator for an NGO.

Task Details:
- Title: {task_title}
- Description: {task_description}
- Location: {task_location}
- Category: {task_category}
- Required Skills: {required_skills}
- Deadline: {deadline}

Available Volunteers (JSON array):
{volunteers_json}

Each volunteer object has: id, display_name, skills (array), availability (array), location_preference, bio.

Select the top 3 most suitable volunteers for this task.
For each, explain in one sentence why they are a good match.

Respond ONLY in this exact JSON format:
{
  "matches": [
    {
      "volunteer_id": "<id>",
      "match_score": <number 1-100>,
      "reason": "<one sentence>"
    }
  ]
}
```

The UI displays the top 3 volunteers with their match score and Gemini's reasoning. Admin selects one (or more, up to `volunteer_count_needed`) and clicks "Assign."

**FR-AI-03: Storing Match Results**

Each time a match is confirmed, a record is saved to `volunteer_task_assignments` table with:
- `volunteer_id`, `task_id`, `assigned_at`, `assigned_by` (admin user id), `gemini_match_score`, `gemini_reason`, `status` (accepted / completed / withdrawn).

---

### Module 6: Analytics Dashboard

**FR-ANALYTICS-01: Admin Home Dashboard**

Shows at a glance:
- Total need reports (this month vs last month, % change)
- Open tasks count
- Volunteers available count
- Tasks completed this month

Charts (using Chart.js):
- Bar chart: Need reports by category (last 30 days)
- Line chart: New reports per day (last 14 days)
- Pie chart: Task status breakdown (open / in_progress / completed)

**FR-ANALYTICS-02: Needs Heatmap (Text-Based)**

A sortable table showing: Location | Total Reports | Avg Urgency Score | Top Category.

Sorted by avg urgency score descending. This is the "heatmap" since a real map tile service would require API keys; a ranked table is clear, simpler, and accurate.

> Note for developer: If you want to add a visual map later, use Leaflet.js with OpenStreetMap (free, no API key).

---

## 4. Non-Functional Requirements

**NFR-01: Performance**
- All API responses (except AI calls) must complete within 500ms for datasets up to 10,000 records.
- Gemini API calls are made asynchronously; the UI shows a loading spinner and does not block.

**NFR-02: Security**
- All passwords hashed with bcrypt (saltRounds: 10).
- JWT secret stored in environment variable, never hardcoded.
- All admin/volunteer API routes protected by JWT middleware.
- Input sanitized on backend to prevent SQL injection (use parameterized queries via `pg` library, never string concatenation).
- CORS configured to allow only the frontend origin.

**NFR-03: Usability**
- All forms show inline validation errors before submission.
- The field agent report form must work on a mobile browser with poor internet (form is lightweight HTML, no heavy JS frameworks on public form page).
- All tables are paginated (20 rows per page) with a "Load More" or page number control.

**NFR-04: Availability**
- Target: 99% uptime using Google Cloud Run's managed infrastructure.
- Database: Supabase free tier (500MB, 2 direct connections) — sufficient for prototype.

**NFR-05: Maintainability**
- All environment-specific values (DB URL, Gemini API key, JWT secret, Gmail credentials) stored in `.env` file and never committed to Git.
- `.env.example` file provided with all required variable names but no values.

---

## 5. System Architecture

### 5.1 Component Overview

```
[Field Agent Browser]
       |
       | POST /api/reports (no auth)
       v
[Express REST API — Node.js]
       |          |           |
       |          |           |
  [PostgreSQL]  [Gemini API]  [Nodemailer/Gmail SMTP]
  (Supabase)
       ^
       |
[Admin Browser] ——— JWT ——— [Express REST API]
[Volunteer Browser] — JWT — [Express REST API]
```

### 5.2 Folder Structure

```
project-root/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── reports.js
│   │   │   ├── tasks.js
│   │   │   ├── volunteers.js
│   │   │   ├── matching.js
│   │   │   └── analytics.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification middleware
│   │   │   └── requireRole.js    # Role-based access control
│   │   ├── db/
│   │   │   ├── pool.js           # pg Pool setup
│   │   │   └── migrate.js        # Run SQL migrations
│   │   ├── services/
│   │   │   ├── gemini.js         # All Gemini API calls
│   │   │   └── mailer.js         # Nodemailer email sending
│   │   └── migrations/
│   │       └── 001_init.sql      # Full schema creation SQL
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx               # React Router setup
│   │   ├── api/
│   │   │   └── client.js         # Axios instance with auth headers
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── NeedReports.jsx
│   │   │   ├── ReportDetail.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── TaskDetail.jsx
│   │   │   ├── Volunteers.jsx
│   │   │   ├── VolunteerProfile.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── PublicReportForm.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── UrgencyBadge.jsx
│   │   │   ├── MatchCard.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   └── charts/
│   │   │       ├── BarChart.jsx
│   │   │       ├── LineChart.jsx
│   │   │       └── PieChart.jsx
│   │   └── context/
│   │       └── AuthContext.jsx   # Global auth state (user, token, logout)
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
├── docker-compose.yml            # Local dev: runs backend + postgres
└── README.md
```

---

## 6. Database Schema

Use PostgreSQL. All tables use UUID primary keys (`gen_random_uuid()`). Run this SQL in Supabase's SQL editor or via `migrate.js`.

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Organizations (NGOs)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code CHAR(6) UNIQUE NOT NULL,  -- public code for field agents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (admins and volunteers share this table, differentiated by role)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'volunteer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer profiles (one per volunteer user)
CREATE TABLE volunteer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',        -- array of skill strings
  availability TEXT[] DEFAULT '{}',  -- array of availability strings
  location_preference TEXT,
  bio TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Need reports submitted by field agents
CREATE TABLE need_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reporter_phone TEXT,
  location TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Food', 'Medical', 'Education', 'Shelter', 'Water', 
    'Sanitation', 'Employment', 'Other'
  )),
  description TEXT NOT NULL,
  severity_self_reported TEXT CHECK (severity_self_reported IN ('Low', 'Medium', 'High')),
  affected_count INTEGER,
  urgency_score NUMERIC(3,1),        -- set by Gemini, 1.0 to 10.0
  urgency_reason TEXT,               -- set by Gemini
  status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'reviewed', 'task_created', 'resolved'
  )),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks created by admin from need reports
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  need_report_id UUID REFERENCES need_reports(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  volunteer_count_needed INTEGER DEFAULT 1,
  deadline DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer-task assignments
CREATE TABLE volunteer_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  gemini_match_score INTEGER,        -- 1 to 100
  gemini_reason TEXT,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('accepted', 'completed', 'withdrawn')),
  completed_at TIMESTAMPTZ,
  UNIQUE (volunteer_id, task_id)
);

-- Indexes for common queries
CREATE INDEX idx_need_reports_org_id ON need_reports(org_id);
CREATE INDEX idx_need_reports_urgency ON need_reports(urgency_score DESC);
CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_assignments_volunteer ON volunteer_task_assignments(volunteer_id);
CREATE INDEX idx_assignments_task ON volunteer_task_assignments(task_id);
```

---

## 7. API Specification

All endpoints return JSON. Errors return `{ "error": "<message>" }`. Auth-protected endpoints require `Authorization: Bearer <jwt>` header.

### 7.1 Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register/admin` | None | `{ org_name, email, password }` | `{ token, user, org }` |
| POST | `/register/volunteer` | None | `{ email, password, name }` | `{ token, user }` |
| POST | `/login` | None | `{ email, password }` | `{ token, user }` |
| GET | `/me` | JWT | — | `{ user }` |

### 7.2 Need Reports Routes (`/api/reports`)

| Method | Endpoint | Auth | Body/Params | Response |
|---|---|---|---|---|
| POST | `/public/:org_code` | None | Report form fields | `{ id, message }` |
| GET | `/` | JWT (admin) | Query: `category, status, min_urgency, max_urgency, from_date, to_date, page, limit` | `{ data: [...], total, page }` |
| GET | `/:id` | JWT (admin) | — | `{ report }` |
| PATCH | `/:id/status` | JWT (admin) | `{ status }` | `{ report }` |
| POST | `/import/csv` | JWT (admin) | `multipart/form-data` with CSV file | `{ imported, errors }` |

### 7.3 Task Routes (`/api/tasks`)

| Method | Endpoint | Auth | Body/Params | Response |
|---|---|---|---|---|
| POST | `/` | JWT (admin) | Task fields | `{ task }` |
| GET | `/` | JWT | Query: `status, category, page, limit` | `{ data: [...], total }` |
| GET | `/:id` | JWT | — | `{ task, assignments }` |
| PATCH | `/:id` | JWT (admin) | Partial task fields | `{ task }` |
| DELETE | `/:id` | JWT (admin) | — | `{ message }` |

### 7.4 Volunteer Routes (`/api/volunteers`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/profile` | JWT (volunteer) | — | `{ profile }` |
| PUT | `/profile` | JWT (volunteer) | Profile fields | `{ profile }` |
| GET | `/my-tasks` | JWT (volunteer) | — | `{ tasks }` |
| PATCH | `/assignments/:assignment_id/complete` | JWT (volunteer) | — | `{ assignment }` |
| GET | `/` | JWT (admin) | Query: `is_available, skills` | `{ volunteers }` |

### 7.5 Matching Routes (`/api/matching`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/task/:task_id/suggest` | JWT (admin) | — | `{ matches: [{ volunteer, match_score, reason }] }` |
| POST | `/task/:task_id/assign` | JWT (admin) | `{ volunteer_id }` | `{ assignment }` |

### 7.6 Analytics Routes (`/api/analytics`)

| Method | Endpoint | Auth | Response |
|---|---|---|---|
| GET | `/summary` | JWT (admin) | `{ total_reports, open_tasks, available_volunteers, completed_this_month }` |
| GET | `/reports-by-category` | JWT (admin) | `[{ category, count }]` |
| GET | `/reports-per-day` | JWT (admin) | `[{ date, count }]` (last 14 days) |
| GET | `/task-status-breakdown` | JWT (admin) | `[{ status, count }]` |
| GET | `/needs-heatmap` | JWT (admin) | `[{ location, total_reports, avg_urgency, top_category }]` |

---

## 8. UI/UX Pages and Screens

Use **Tailwind CSS** for all styling. No component library needed (keeps it simple).

### 8.1 Public Report Form (`/report/:org_code`)

- Clean, single-column form. White card on light grey background.
- NGO name shown at top (fetched from org_code).
- All fields with labels and placeholder text.
- Submit button: full-width, green.
- On success: replace form with a "Thank You" card showing a checkmark icon.
- On error: show error banner at top of form.
- No navbar, no sidebar — this page is standalone.

### 8.2 Login / Register Pages

- Centered card layout. Logo placeholder at top.
- Toggle between "Admin" and "Volunteer" tab for registration.
- Login is shared (role determined from DB).
- Show/hide password toggle button inside password field.

### 8.3 Admin Sidebar Layout

All admin pages use a persistent left sidebar containing:
- Organization name
- Navigation links: Dashboard, Need Reports, Tasks, Volunteers, Analytics
- Logout button at bottom

### 8.4 Admin Dashboard (`/admin/dashboard`)

- Top row: 4 stat cards (Total Reports, Open Tasks, Available Volunteers, Completed This Month).
- Middle row: Bar chart (reports by category) + Line chart (reports per day).
- Bottom row: Pie chart (task status) + Needs Heatmap table.

### 8.5 Need Reports Page (`/admin/reports`)

- Top bar: filter controls (category dropdown, status dropdown, urgency range slider, date range pickers).
- Below: responsive card grid or table. Each card shows: location, category badge (color-coded), urgency score badge (red=8-10, orange=5-7, green=1-4), truncated description, date, status, "View" button.
- Pagination at bottom.

### 8.6 Report Detail Page (`/admin/reports/:id`)

- Two-column layout.
- Left: full report details (all fields), AI urgency score with badge + reason in a highlighted box.
- Right: Google Maps embed (`https://maps.google.com/maps?q=LOCATION&output=embed`) — works without API key for basic display.
- Bottom action bar: "Mark Reviewed" button, "Create Task" button.

### 8.7 Tasks Page (`/admin/tasks`)

- Filter bar: status, category.
- Task cards: title, location, deadline, volunteers needed/assigned, status badge, "View" button.
- Floating action button (bottom right): "+ New Task" (links to standalone task creation form).

### 8.8 Task Detail Page (`/admin/tasks/:id`)

- Task info at top (all fields).
- "Find Best Volunteers" button — triggers Gemini matching API call.
- While loading: spinner with text "Gemini AI is finding the best matches..."
- After loading: 3 volunteer match cards, each showing: name, match score (progress bar), skills, availability, Gemini's reason, "Assign" button.
- Assigned Volunteers section below: shows confirmed assignments with name, assignment date, status.

### 8.9 Volunteer Dashboard (`/volunteer/dashboard`)

- Welcome header with volunteer's name.
- "My Tasks" section: list of assigned tasks with status, deadline.
- Profile summary card (skills, availability).
- "Update Profile" link.

### 8.10 Volunteer Profile Page (`/volunteer/profile`)

- Form with all profile fields.
- Skills: multi-select tag input (click to add/remove tags).
- Availability: checkboxes.
- "Currently Available" toggle (prominent, top of form).
- Save button.

---

## 9. Technology Stack

### 9.1 Frontend

| Technology | Purpose | Why |
|---|---|---|
| React 18 (Vite) | UI framework | Fast setup, no server-side rendering complexity |
| React Router v6 | Client-side routing | Standard, simple |
| Axios | HTTP client | Cleaner than fetch, easy interceptors |
| Tailwind CSS | Styling | No CSS files, utility-first, fast |
| Chart.js + react-chartjs-2 | Charts | Simple API, well-documented |
| react-hot-toast | Notifications | Lightweight toast library |

### 9.2 Backend

| Technology | Purpose | Why |
|---|---|---|
| Node.js 20 | Runtime | Universal, large ecosystem |
| Express.js | REST API framework | Minimal, easy to understand |
| pg (node-postgres) | PostgreSQL client | Direct, no ORM complexity |
| bcrypt | Password hashing | Industry standard |
| jsonwebtoken | JWT auth | Simple, well-maintained |
| multer | File uploads (CSV) | Standard Express middleware |
| csv-parse | CSV parsing | Simple, no dependencies |
| nodemailer | Email sending | Works with Gmail SMTP |
| @google/generative-ai | Gemini API client | Official Google SDK |
| dotenv | Environment variables | Standard |
| cors | CORS headers | One-liner setup |

### 9.3 Database

| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary database |
| Supabase (free tier) | Hosted PostgreSQL — no server setup |

### 9.4 Infrastructure (Google Cloud)

| Service | Purpose |
|---|---|
| Google Cloud Run | Hosts backend Docker container — scales to zero, free tier |
| Google Cloud Build | CI: auto-deploys on git push (optional) |
| Firebase Hosting | Hosts React frontend static build — free tier, global CDN |
| Google Gemini API (gemini-1.5-flash) | AI scoring and matching |

---

## 10. Google AI Integration (Gemini)

### 10.1 Model

Use `gemini-1.5-flash` — fast, cost-effective, sufficient for text generation tasks.

### 10.2 SDK Usage

```javascript
// backend/src/services/gemini.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function scoreNeedReport(report) {
  const prompt = `
You are an expert at evaluating community welfare need reports for NGOs.

Given the following need report, assign an urgency score from 1 to 10 (10 = most urgent) 
and provide a one-sentence reason.

Report:
- Category: ${report.category}
- Description: ${report.description}
- Self-reported severity: ${report.severity_self_reported || 'Not specified'}
- Estimated people affected: ${report.affected_count || 'Not specified'}

Respond ONLY in this exact JSON format with no extra text:
{"urgency_score": <number 1-10>, "urgency_reason": "<one sentence>"}
  `.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Strip markdown code fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function matchVolunteers(task, volunteers) {
  const prompt = `
You are an expert volunteer coordinator for an NGO.

Task Details:
- Title: ${task.title}
- Description: ${task.description}
- Location: ${task.location}
- Category: ${task.category}
- Required Skills: ${task.required_skills.join(', ')}
- Deadline: ${task.deadline}

Available Volunteers:
${JSON.stringify(volunteers.map(v => ({
  id: v.user_id,
  name: v.display_name,
  skills: v.skills,
  availability: v.availability,
  location_preference: v.location_preference,
  bio: v.bio
})), null, 2)}

Select the top 3 most suitable volunteers for this task.
Respond ONLY in this exact JSON format with no extra text:
{"matches": [{"volunteer_id": "<id>", "match_score": <1-100>, "reason": "<one sentence>"}]}
  `.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

module.exports = { scoreNeedReport, matchVolunteers };
```

### 10.3 Error Handling for Gemini Calls

All Gemini calls are wrapped in try/catch. On failure:
- Log the error to console.
- Return `null` for score (stored as NULL in DB).
- API route returns success (the report is saved), but with a field `ai_score_pending: true`.
- Frontend shows "Score Pending" badge instead of a number.

Retry logic: Not implemented in v1 to keep complexity low. Admin can manually re-trigger scoring from report detail page (button: "Re-score with AI").

---

## 11. Deployment Plan (Google Cloud)

### 11.1 Prerequisites

- Google Cloud account (free tier)
- Supabase account (free tier)
- Gmail account for SMTP
- Gemini API key from Google AI Studio (https://aistudio.google.com)

### 11.2 Environment Variables

Create `backend/.env`:

```
PORT=8080
DATABASE_URL=postgresql://postgres:<password>@<supabase-host>:5432/postgres
JWT_SECRET=<random 64-char string>
GEMINI_API_KEY=<your gemini api key>
GMAIL_USER=<your gmail address>
GMAIL_APP_PASSWORD=<gmail app password>
FRONTEND_URL=https://<your-firebase-app>.web.app
```

Create `frontend/.env`:

```
VITE_API_BASE_URL=https://<your-cloud-run-service-url>
```

### 11.3 Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8080
CMD ["node", "src/index.js"]
```

### 11.4 Deploy Backend to Cloud Run

```bash
# From backend/ directory
gcloud builds submit --tag gcr.io/<PROJECT_ID>/smart-resource-backend
gcloud run deploy smart-resource-backend \
  --image gcr.io/<PROJECT_ID>/smart-resource-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=...,JWT_SECRET=...,GEMINI_API_KEY=...,GMAIL_USER=...,GMAIL_APP_PASSWORD=...,FRONTEND_URL=...
```

### 11.5 Deploy Frontend to Firebase Hosting

```bash
# From frontend/ directory
npm run build
firebase init hosting   # choose dist/ as public directory, SPA: yes
firebase deploy
```

### 11.6 Initialize Database

After Supabase project is created, paste the SQL from `backend/src/migrations/001_init.sql` into the Supabase SQL Editor and run it.

---

## 12. User Roles and Permissions

| Action | Admin | Volunteer | Field Agent (unauthenticated) |
|---|---|---|---|
| Submit need report | ✓ | ✗ | ✓ (via public form) |
| View need reports | ✓ | ✗ | ✗ |
| Create/edit tasks | ✓ | ✗ | ✗ |
| View tasks | ✓ | ✓ (own only) | ✗ |
| Trigger Gemini matching | ✓ | ✗ | ✗ |
| Assign volunteers to tasks | ✓ | ✗ | ✗ |
| Edit own volunteer profile | ✗ | ✓ | ✗ |
| Mark task completed | ✗ | ✓ (own only) | ✗ |
| View analytics | ✓ | ✗ | ✗ |
| View all volunteers list | ✓ | ✗ | ✗ |
| Import CSV | ✓ | ✗ | ✗ |

Role is stored in the JWT payload as `role: "admin"` or `role: "volunteer"`. The `requireRole` middleware on backend routes enforces this.

---

## 13. Constraints and Assumptions

1. **Single Organization per Admin:** Each admin account belongs to exactly one organization. Multi-org support is a future enhancement.

2. **Volunteer Organization Linking:** In v1, volunteers are global (not org-specific). Admin can see all registered volunteers. This simplifies the matching pool for a prototype.

3. **No Real-time Updates:** The system uses standard HTTP polling. No WebSockets. Admin refreshes the page to see new reports.

4. **CSV Import Limit:** Max 500 rows per CSV import to avoid Supabase free tier connection timeouts.

5. **Gemini Quota:** The free tier of Gemini API allows 15 requests per minute. Bulk CSV imports with 500 rows will batch scoring in groups of 10 with a 1-second delay between batches.

6. **No Payment, No Premium Features:** This is an entirely free-to-use prototype.

7. **Email Delivery:** Gmail SMTP with App Password is used. Daily sending limit is ~500 emails/day — sufficient for a prototype.

8. **Location:** Location is stored as plain text (e.g., "Ward 5, Rajkot"). No geocoding API is required. Google Maps embed handles display via text search query.

---

## 14. Future Enhancements

These are explicitly out of scope for v1 but should be noted for the Future Development slide.

1. **Real-time notifications** using WebSockets or Firebase Realtime Database.
2. **WhatsApp/SMS integration** (Twilio) for field agents who cannot access email.
3. **Mobile App** (React Native / Expo) for field agents and volunteers.
4. **Multi-language support** (Hindi, Gujarati) using i18next.
5. **Visual geospatial heatmap** using Leaflet.js + OpenStreetMap (free).
6. **Automated re-scoring** when description is updated.
7. **Volunteer rating system** so admin can rate volunteers after task completion.
8. **Volunteer availability calendar** integration (Google Calendar API).
9. **Bulk task creation** from a single large need report.
10. **Export to PDF/Excel** for reports and task summaries for offline NGO meetings.

---

*End of SRS — Smart Resource Allocation v1.0*

*This document is complete and self-contained. An AI coding assistant with access to this file should be able to scaffold the entire project from scratch without additional clarification.*
