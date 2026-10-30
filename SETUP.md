# Connecting the shared backend (Sandbox ⇄ Liveroom)

Out of the box the app runs in **demo mode**: data stays in one browser, and the login screen offers "Continue as Sandbox / Liveroom". To let the two teams really work together (separate logins, shared comments, issues and reference images), connect a free **Supabase** project. About 10 minutes, no code changes beyond two values.

## 1. Create the project
1. Go to <https://supabase.com> → **New project** (free plan is fine). Pick a region close to you and save the database password.
2. When it finishes, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**

## 2. Create the database
1. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
2. That creates the tables, the access rules (only your two team accounts can read or write) and the private `references` image bucket.

## 3. Create the two logins
1. **Authentication → Providers → Email**: keep it enabled. Under **Authentication → Sign In / Providers** turn **off "Allow new users to sign up"** so nobody else can register.
2. **Authentication → Users → Add user → Create new user**. Create one account for each team (tick *Auto Confirm User*):
   - e.g. `sandbox@yourcompany.com` + a strong password
   - e.g. `liveroom@yourcompany.com` + a strong password
   (More people per team? Create more users and link them the same way.)
3. Link each account to its team. In **SQL Editor** run (change the emails to yours):

```sql
insert into public.profiles (id, team, display_name)
select id, 'sandbox', 'Sandbox team' from auth.users where email = 'sandbox@yourcompany.com';

insert into public.profiles (id, team, display_name)
select id, 'liveroom', 'Liveroom team' from auth.users where email = 'liveroom@yourcompany.com';
```

## 4. Point the app at it
Edit [`config.js`](config.js):

```js
window.CALYBRATE_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...'
};
```

Reload the site. You now get a real email + password login. The anon key is safe to publish; every read and write is checked against the access rules from step 2.

## How the two teams work together
- **Sandbox** uploads page-structure / reference images on any section and raises **issues**.
- **Liveroom** opens those images, comments right on them, updates step status, and resolves issues.
- Everything updates live for both teams, and the Activity list shows who did what.

## Notes
- Images are shrunk in the browser before upload (max ~1800 px) to stay inside the free storage limit.
- To remove someone, delete their user in **Authentication → Users**.
- If you ever see "This account is not linked to a team yet", re-run the step 3 SQL for that email.
