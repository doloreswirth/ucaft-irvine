begin;
create table public.chapter_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('organizer','editor','admin'))
);
alter table public.chapter_members enable row level security;
revoke all on public.chapter_members from anon, authenticated;
grant select on public.chapter_members to authenticated;
create policy member_reads_self on public.chapter_members for select to authenticated using (user_id = (select auth.uid()));
-- Membership can only be managed through the trusted project administration.
-- There is no browser write grant, signup trigger, or self-assigned role.
create function public.chapter_role() returns text language sql stable security definer set search_path = '' as $$
 select role from public.chapter_members where user_id = (select auth.uid());
$$;
revoke all on function public.chapter_role() from public;
grant execute on function public.chapter_role() to anon, authenticated;

create table public.chapter_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 2000),
 event_date date not null, start_time time, location text not null default '',
 description text not null default '', url text not null default '' check (url = '' or url ~* '^https?://'),
 visibility text not null default 'internal' check (visibility in ('public','internal')),
 created_at timestamptz not null default now()
);
create table public.chapter_updates (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 2000), body text not null default '',
 url text not null default '' check (url = '' or url ~* '^https?://'),
 visibility text not null default 'internal' check (visibility in ('public','internal')),
 created_at timestamptz not null default now()
);
create table public.chapter_info (
 id integer primary key default 1 check (id = 1), title text not null,
 description text not null default '', leadership text not null default '',
 contact_email text not null default '', resource_url text not null default '' check (resource_url = '' or resource_url ~* '^https?://')
);
create table public.chapter_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 2000),
 lead text not null default '', description text not null default '',
 document_url text not null default '' check (document_url = '' or document_url ~* '^https?://')
);
create table public.chapter_tasks (
 id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) between 1 and 2000),
 owner text not null default '', campaign_id uuid references public.chapter_campaigns(id) on delete set null,
 due date, priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
 status text not null default 'To Do' check (status in ('To Do','In Progress','Blocked','Done')),
 notes text not null default ''
);

alter table public.chapter_events enable row level security;
alter table public.chapter_updates enable row level security;
alter table public.chapter_info enable row level security;
alter table public.chapter_tasks enable row level security;
alter table public.chapter_campaigns enable row level security;
revoke all on public.chapter_events, public.chapter_updates, public.chapter_info, public.chapter_tasks, public.chapter_campaigns from anon, authenticated;
grant select on public.chapter_events, public.chapter_updates, public.chapter_info to anon;
grant select, insert, update, delete on public.chapter_events, public.chapter_updates, public.chapter_info, public.chapter_tasks, public.chapter_campaigns to authenticated;
create policy read_events on public.chapter_events for select to anon, authenticated using (visibility = 'public' or (select public.chapter_role()) is not null);
create policy read_updates on public.chapter_updates for select to anon, authenticated using (visibility = 'public' or (select public.chapter_role()) is not null);
create policy read_info on public.chapter_info for select to anon, authenticated using (true);
create policy read_tasks on public.chapter_tasks for select to authenticated using ((select public.chapter_role()) is not null);
create policy read_campaigns on public.chapter_campaigns for select to authenticated using ((select public.chapter_role()) is not null);

do $$
declare tab text;
begin
 foreach tab in array array['chapter_events','chapter_updates','chapter_info','chapter_tasks','chapter_campaigns'] loop
  execute format('create policy editor_insert on public.%I for insert to authenticated with check ((select public.chapter_role()) in (''editor'',''admin''))', tab);
  execute format('create policy editor_update on public.%I for update to authenticated using ((select public.chapter_role()) in (''editor'',''admin'')) with check ((select public.chapter_role()) in (''editor'',''admin''))', tab);
  execute format('create policy editor_delete on public.%I for delete to authenticated using ((select public.chapter_role()) in (''editor'',''admin''))', tab);
 end loop;
end $$;
insert into public.chapter_info (title,description) values ('UC AFT Irvine','Chapter information, events, and updates.');
create index chapter_events_date on public.chapter_events(event_date);
create index chapter_tasks_campaign on public.chapter_tasks(campaign_id);
commit;
