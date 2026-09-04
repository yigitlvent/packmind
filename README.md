# PackMind

A pre-departure mistake catcher for travelers.

Traditional packing apps tell you what to pack. PackMind goes one step further and notices when something in your packing state does not make sense — like packing a laptop and leaving the charger behind.

## Run locally

```bash
cd packmind
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The homepage is the PackMind landing page. **Plan My Trip** starts a guest session if needed and opens the trip form. Google is optional from the **Guest** menu via **Continue with Google**.

Without Supabase credentials, Google sign-in is hidden and trips are stored in the browser (localStorage).

## Example trip

Plan a trip with a real destination and dates. The form starts empty, with no trip type or activities selected. Example:

- Destination: Seattle
- Dates: a few days that fall within the 16-day forecast window
- Trip type: Business (you must choose one)
- Activities: Gym
- Laptop: yes
- Weather: fetched after destination and both dates are entered (manual fallback if the forecast is unavailable)

Build the list, then pack **Laptop** and **Gym clothes**. Leave **Laptop charger**, **Gym shoes**, and rain protection unpacked if rain is expected. Run Final Check — you should see those gaps.

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Anonymous** sign-ins under Authentication → Providers (used when a visitor clicks Plan My Trip).
3. Run `supabase/schema.sql` in the SQL editor.
   If the project already has the original tables, also run:
   - `supabase/migration_weather_dates.sql` for trip dates and the `mild` weather profile
   - `supabase/migration_user_saved_items.sql` for Google users’ reusable packing items
   - `supabase/migration_guest_trip_migration.sql` to move guest trips into a Google account after sign-in
4. Copy `.env.example` to `.env.local` and add:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Enable Google (below), then restart the dev server.

Row Level Security scopes trips and packing items to `auth.uid()`. Google users and guests only see their own rows.

### Google OAuth

PackMind uses Supabase Auth with PKCE. Google redirects to **Supabase**, then Supabase sends the user back to `/auth/callback`.

**Google Cloud Console**

1. APIs & Services → Credentials → Create **OAuth client ID** (Web application).
2. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://YOUR-APP.vercel.app`
3. Authorized redirect URIs (this is the Supabase callback, not the PackMind route):
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Supabase Dashboard**

1. Authentication → Providers → **Google** → enable.
2. Paste the Google client ID and client secret (secret stays in the dashboard, never in the app).
3. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` for local, or your Vercel URL in production.
   - Additional Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://YOUR-APP.vercel.app/auth/callback`
4. Guest trips move to the Google account after sign-in via a one-time server-side migration (run `migration_guest_trip_migration.sql`). Existing Google trips are kept. Manual identity linking is no longer required for this.

## Deploy on Vercel

1. Import the repo in Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Add the Vercel origin and `/auth/callback` URLs in Google Cloud and Supabase as above.
4. Deploy.

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL.
