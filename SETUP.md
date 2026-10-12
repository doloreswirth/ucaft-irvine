# Chapter website setup

This branch replaces the temporary dashboard with a public calendar and chapter updates, plus an organizer workspace. It is a deployment candidate, not a functioning production service until the steps below are complete.

## Connection

1. Select or create a Supabase project owned by the chapter. Review any plan charges before provisioning paid resources.
2. Apply `supabase/migrations/202610120001_chapter.sql` once to that project. No real organizer data is seeded.
3. Put the project URL and public publishable key in `config.js`. Never put service role keys or database passwords in GitHub.
4. Use Supabase Auth administration to create approved organizer accounts. Disable public signup. Provision passwords through a secure process; do not send passwords in GitHub or chat. The first version uses email and password sign in, with no self registration or automated invitation emails. Password resets currently require the administrator, so set up and test an account recovery process before launch.
5. Add each approved user's UUID to `chapter_members`, with role `organizer` (view), `editor` (content editing), or `admin` (content editing). Only project administrators can change membership roles. No member emails are stored in the public repository.
6. Confirm the intended administrator email with Lola before provisioning her account. Do not infer an email from Git commits.

## Data and permissions

The database enforces access, including requests made outside the website. Events and updates default to internal. Public visitors can read only public events, public updates, and chapter information. Approved organizers can read internal events, tasks, campaigns and documents. Editors and admins can write chapter content. Unapproved authenticated accounts have the same content access as public visitors. No authenticated browser can change membership roles.

Sessions use browser session storage, clear on sign out, and refresh via the Supabase client. Shared records load on navigation initialization, after edits, and every minute while the tab is visible and an editor is not open. Database failures clear internal content and report an error. Do not market this as live simultaneous editing: overlapping saves use last write wins. Add optimistic concurrency if concurrent editing becomes common.

The calendar is custom HTML, with event details and external links. Dates and times represent America/Los_Angeles. There is no Google Calendar embed. Each event has one date and an optional start time; recurring and multiday events are not yet implemented.

## Release gate

Keep this branch unmerged until connected testing passes:

1. Anonymous visitor: see only public data. Direct REST requests must not return internal events, tasks, campaigns or other membership records. Writes must fail.
2. Unapproved authenticated account: same content as public; all writes fail.
3. Organizer: read internal records; insert/update/delete and membership changes must fail even through direct REST.
4. Editor: create/update/delete a test event, update, task, and campaign. Verify saved data from a second browser and after refresh. Cannot change membership.
5. Sign out and revoke membership: ensure private records disappear and direct requests are denied. Test expired sessions and network failures.
6. Test keyboard dialogs, links, month navigation, phone layout, and script loading. Confirm public event links contain only information intended for public viewing.
7. Check exact installed Supabase JS version for current security advisories before production. Current import is pinned to 2.49.1; update and test as appropriate.
8. Merge only after tests and account setup. Preserve `CNAME` and GitHub Pages branch configuration. Verify deployment at the existing domain.

Local checks: `node --test tests/domain.test.mjs` and `node --input-type=module --check < app.js`.

Browser QA and live authentication/RLS integration tests were not available during initial preparation. No claims of live sign in, production persistence, or verified access control should be made until release testing is complete.
