-- =============================================================================
-- EMPLOYEE TASK MANAGER - SUPABASE SCHEMA & ROW-LEVEL SECURITY (RLS)
-- Project: https://hkbxzosiregbfiqrtvkz.supabase.co
-- =============================================================================

create extension if not exists "pgcrypto";
create schema if not exists private;

-- 1. PROFILES TABLE (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin', 'superadmin')),
  department text not null default 'General',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. TASKS TABLE (Includes Soft-Delete Audit Fields)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  project_name text,
  category text not null default 'General',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'completed', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  task_date date not null default current_date,
  due_date date,
  completed_date date,
  hours_spent numeric(5,2) not null default 0 check (hours_spent >= 0),
  timer_started_at timestamptz,
  timer_accumulated_seconds integer not null default 0 check (timer_accumulated_seconds >= 0),
  is_timer_running boolean not null default false,
  manager_feedback text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TASK COMMENTS TABLE (For Employee <-> Manager updates & discussion)
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 4. DEPARTMENTS / CATEGORIES TABLE (Managed by Manager / Admin / Superadmin)
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. PROJECTS TABLE (Managed by Manager / Superadmin)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. PROJECT MEMBERS TABLE (Assign Employees to Projects)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, employee_id)
);

-- Indexes for fast filtering by employee, status, author, and date
create index if not exists idx_tasks_employee_id on public.tasks(employee_id);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_task_date on public.tasks(task_date desc);
create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_task_comments_author_id on public.task_comments(author_id);

-- Auto-update updated_at timestamp on tasks
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- Auto-create profile row when a new user signs up in Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'User'), '@', 1)),
    case
      when new.raw_user_meta_data->>'role' in ('employee', 'manager', 'admin')
        then new.raw_user_meta_data->>'role'
      else 'employee'
    end,
    coalesce(new.raw_user_meta_data->>'department', 'General')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- HELPER FUNCTION FOR ROLE CHECKS (Non-exposed private schema, avoids RLS recursion)
-- =============================================================================
create or replace function private.is_manager_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('manager', 'admin')
  );
$$;

revoke execute on function private.is_manager_or_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_manager_or_admin() to authenticated;

grant select, insert, update, delete on public.profiles, public.tasks, public.task_comments to authenticated;

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- PROFILES POLICIES
drop policy if exists "Profiles: view own or manager views all" on public.profiles;
create policy "Profiles: view own or manager views all"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_manager_or_admin()
    or role in ('manager', 'admin')
  );

drop policy if exists "Profiles: insert own profile" on public.profiles;
create policy "Profiles: insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()) or private.is_manager_or_admin());

drop policy if exists "Profiles: update own or manager updates all" on public.profiles;
create policy "Profiles: update own or manager updates all"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or private.is_manager_or_admin())
  with check (
    (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())))
    or private.is_manager_or_admin()
  );

-- TASKS POLICIES
drop policy if exists "Tasks: employee views own, manager views all" on public.tasks;
create policy "Tasks: employee views own, manager views all"
  on public.tasks
  for select
  to authenticated
  using (
    employee_id = (select auth.uid())
    or private.is_manager_or_admin()
  );

drop policy if exists "Tasks: employee logs own, manager assigns any" on public.tasks;
create policy "Tasks: employee logs own, manager assigns any"
  on public.tasks
  for insert
  to authenticated
  with check (
    (employee_id = (select auth.uid()) and created_by = (select auth.uid()))
    or private.is_manager_or_admin()
  );

drop policy if exists "Tasks: employee updates own, manager updates all" on public.tasks;
create policy "Tasks: employee updates own, manager updates all"
  on public.tasks
  for update
  to authenticated
  using (
    employee_id = (select auth.uid())
    or private.is_manager_or_admin()
  )
  with check (
    employee_id = (select auth.uid())
    or private.is_manager_or_admin()
  );

drop policy if exists "Tasks: employee deletes own, manager deletes all" on public.tasks;
create policy "Tasks: employee deletes own, manager deletes all"
  on public.tasks
  for delete
  to authenticated
  using (
    employee_id = (select auth.uid())
    or private.is_manager_or_admin()
  );

-- TASK COMMENTS POLICIES
drop policy if exists "Comments: view if can view parent task" on public.task_comments;
create policy "Comments: view if can view parent task"
  on public.task_comments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and (t.employee_id = (select auth.uid()) or private.is_manager_or_admin())
    )
  );

drop policy if exists "Comments: insert if can access parent task" on public.task_comments;
create policy "Comments: insert if can access parent task"
  on public.task_comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and (t.employee_id = (select auth.uid()) or private.is_manager_or_admin())
    )
  );

drop policy if exists "Comments: delete own or manager" on public.task_comments;
create policy "Comments: delete own or manager"
  on public.task_comments
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or private.is_manager_or_admin()
  );

-- =============================================================================
-- MANAGER / ADMIN RPC: CREATE EMPLOYEE ACCOUNT
-- Allows an authenticated Manager/Admin to register new employee accounts
-- without logging out of their own session.
-- =============================================================================
create or replace function public.create_employee_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_department text default 'General',
  p_role text default 'employee'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_new_user_id uuid := gen_random_uuid();
  v_clean_email text := lower(trim(p_email));
  v_clean_role text := case when p_role in ('employee', 'manager', 'admin') then p_role else 'employee' end;
  v_pw_hash text;
begin
  if (select auth.uid()) is null or not private.is_manager_or_admin() then
    raise exception 'Access denied: Only managers and admins can register employee accounts.';
  end if;

  if v_clean_email = '' or position('@' in v_clean_email) = 0 then
    raise exception 'Please provide a valid email address.';
  end if;

  if char_length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_clean_email) then
    raise exception 'An account with email % already exists.', v_clean_email;
  end if;

  v_pw_hash := crypt(p_password, gen_salt('bf'));

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_clean_email,
    v_pw_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', trim(p_full_name),
      'role', v_clean_role,
      'department', coalesce(nullif(trim(p_department), ''), 'General')
    ),
    now(),
    now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', v_clean_email),
    'email',
    v_new_user_id::text,
    now(),
    now(),
    now()
  );

  return v_new_user_id;
end;
$$;

revoke execute on function public.create_employee_account(text, text, text, text, text) from public, anon;
grant execute on function public.create_employee_account(text, text, text, text, text) to authenticated;
