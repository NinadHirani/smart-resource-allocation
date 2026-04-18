CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code CHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'volunteer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE volunteer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  availability TEXT[] DEFAULT '{}',
  location_preference TEXT,
  bio TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  urgency_score NUMERIC(3,1),
  urgency_reason TEXT,
  status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'reviewed', 'task_created', 'resolved'
  )),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE volunteer_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  gemini_match_score INTEGER,
  gemini_reason TEXT,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('accepted', 'completed', 'withdrawn')),
  completed_at TIMESTAMPTZ,
  UNIQUE (volunteer_id, task_id)
);

CREATE INDEX idx_need_reports_org_id ON need_reports(org_id);
CREATE INDEX idx_need_reports_urgency ON need_reports(urgency_score DESC);
CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_assignments_volunteer ON volunteer_task_assignments(volunteer_id);
CREATE INDEX idx_assignments_task ON volunteer_task_assignments(task_id);
