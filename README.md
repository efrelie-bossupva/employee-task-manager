# Employee Task Logging & Manager Monitoring System

A web application built with **React (Vite + TypeScript)**, **Tailwind CSS**, and **Supabase (Auth + PostgreSQL + Row-Level Security)** designed for cloud deployment on **GitHub Pages** or **Vercel**.

## Key Capabilities

1. **Role-Based Access Control (Employee vs. Manager/Admin)**
   - **Employees (`role = 'employee'`)**:
     - Can **only** view, log, and update their own tasks.
     - Log daily tasks with category, status, priority, date, and hours spent.
     - View tasks assigned by managers, read manager feedback, and post comments.
   - **Managers & Admins (`role in ('manager', 'admin')`)**:
     - Can view **all employees' tasks** across the organization.
     - Filter tasks by specific employee, status, priority, date range, or keyword search.
     - Switch between **Task Log List**, **Kanban Status Board**, and **Employees Performance Monitor**.
     - Assign tasks to employees, write official manager feedback, manage roles, and export filtered logs to CSV.

2. **Database-Level Security (Supabase RLS)**
   - [supabase/schema.sql](./supabase/schema.sql) defines `profiles`, `tasks`, and `task_comments` tables along with strict PostgreSQL Row-Level Security policies so data isolation is enforced at the database layer.

---

## Setup & Deployment Guide

### 1. Set Up Supabase Database
1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** in your Supabase dashboard, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**.
3. Go to **Project Settings → API** and copy your:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon public key** (`VITE_SUPABASE_ANON_KEY`)

### 2. Run Locally
```bash
cp .env.example .env
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
npm install
npm run dev
```
*(You can also click **Connect Supabase DB** directly inside the app's UI to connect your Supabase project or test immediately using the built-in Demo Mode accounts!)*

### 3. Deploy to GitHub Pages (Included Workflow)
This project includes [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) for automatic deployment to GitHub Pages:
1. Push this repository to GitHub (`origin` is configured for `https://github.com/efrelie-bossupva/employee-task-manager.git`).
2. In your GitHub repository, navigate to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Navigate to **Settings → Secrets and variables → Actions** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Every push to `main` automatically builds and publishes your app to GitHub Pages!

