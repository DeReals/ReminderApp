# Daymark

A responsive to-do app built with React, TypeScript, Vite, and Supabase. It includes email/password accounts, private task storage, priorities, categories, due dates, search, filters, and a month calendar. Phone notifications and text messages are intentionally left for a later version.

## Get started

1. Create a Supabase project.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` from the project's API settings. The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names are also supported.
3. In the Supabase SQL Editor, run `20261031000000_create_tasks.sql`, `20261031223000_create_study_reminders.sql`, `20261031230000_add_spaced_repetition.sql`, `20261031233000_create_discipline_coach.sql`, and `20261031234000_enable_discipline_commitment_delete.sql` in that order. The older study-card migration is no longer needed; if you already ran it, its table is left untouched and the app no longer uses it.
4. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite and create an account. If email confirmation is enabled in Supabase Auth, confirm the signup email before signing in.

The migrations enable Row Level Security and scope every task, study-reminder, and discipline-coach operation to its owner. They can be safely run again. The discipline coach lets you define small minimum actions, weekly cues, daily check-ins, and follow-through streaks. Spaced review schedules advance when you mark a review complete, using 1 day, 3 days, 1 week, 3 weeks, 6 weeks, 3 months, 6 months, and 1 year intervals. Browser notifications require permission and the app to remain open; reminders when the app is closed require a push-notification service. Only use the Supabase anon/publishable key in the browser; never put a service-role key in `.env`.

## Build

```sh
npm run build
```
