# rushs

Review tool for post-production teams: editors upload rushes, reviewers watch them, comment at a precise timecode and approve or ask for changes, everyone sees updates live.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and Supabase (Postgres, Auth, Storage, Realtime).

## What it does

- **Projects with roles per project**: the same person can be an editor (Monteur) on one project and a reviewer (Validateur) on another. The creator of a project adds members by the email of an existing, confirmed account.
- **Rushes and versions**: editors upload videos (MP4, MOV, WebM) or images (JPEG, PNG, WebP) up to 50 MB, then new versions of a rush (V2, V3…). Files are private and served through signed urls valid for one hour.
- **Review status per version**: pending, changes requested, approved. Only a reviewer of the project can change it.
- **Comments**: every member comments on a version; a video comment can be pinned to the current time, and clicking its timecode brings the player there.
- **Review history is kept**: a version reviewed once or commented can no longer be deleted, nor its rush. Deleting is only for a wrong file.
- **Live updates**: new comments, versions and statuses appear without reloading on the rush page; the project page updates on new versions and statuses.

## Data model

```
auth.users ──1:1── profiles
                      │
projects ──< project_members >── profiles        role: editor | reviewer
   │
   └──< assets ──< versions ──< comments          versions.status: pending | changes_requested | approved
         kind: video | image
         last_version_number

Storage bucket "rushes" (private): {project_id}/{asset_id}/{file_id}.{ext}
```

| Table | Holds |
| --- | --- |
| `profiles` | One row per account, created by a trigger on sign up |
| `projects`, `project_members` | Projects and who is in them, with their role |
| `assets` | A rush: title, kind, and the counter that numbers its versions |
| `versions` | A file of a rush: number, storage path, type, size, uploader, review status |
| `comments` | Text on a version, its author, an optional timecode |

Migrations live in [`supabase/migrations`](supabase/migrations) and are the source of truth for the schema.

## Security choices

Authorization lives in the database, not in the app: the Next.js proxy only redirects signed-out users, Row Level Security decides what each request may read or write.

- **Reads** go through RLS policies: a user only sees the projects they belong to, their members, rushes, versions, files and comments.
- **Writes go through `security definer` functions**, with direct `insert` / `update` / `delete` revoked on the tables: `create_project`, `add_project_member`, `register_asset`, `add_version`, `delete_asset`, `delete_version`, `set_version_status`. Each checks the caller's rights itself (signed in, project creator, editor or uploader, reviewer), with `search_path = ''`. Comments are the exception: members insert them directly, and RLS checks they write as themselves on a version of their project.
- **Membership helpers live in a `private` schema** the API does not expose (`is_project_member`, `is_project_editor`, `is_project_reviewer`…). They are `security definer` so a policy never depends on the caller's RLS on another table.
- **Uploads**: the browser sends the file straight to Storage, then the server registers it. Size and type are read from what Storage recorded, never from the client, and the path must sit under the right project and rush. An uploaded file is never replaced.
- **File deletion**: rows go first in a database function, then the app removes the files through the Storage API. The Storage policy only lets a user delete a file no version points to anymore.
- **Columns written by the database stay out of reach**: a comment's id, author and date cannot be sent by the client, so the history cannot be backdated.
- **Realtime** only listens to inserts and updates, the events Realtime filters with each subscriber's RLS.

## Run it locally

Requirements: Node.js 22.12 or later (`engines` in `package.json`; [`.nvmrc`](.nvmrc) pins 22.14), a Supabase project, and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) through `npx supabase`.

1. Install the dependencies

   ```bash
   npm install
   ```

2. Create `.env.local` with your Supabase project's url and publishable key (Project Settings → API Keys)

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

   Both are validated at start-up ([`src/lib/env-schema.ts`](src/lib/env-schema.ts)).
   Sign up confirms the email through a link to `/auth/callback`: in Supabase, Authentication → URL Configuration, use `http://localhost:3000` as Site URL or add `http://localhost:3000/auth/callback` to the Redirect URLs.

3. Apply the migrations to your project

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

4. Start the app on http://localhost:3000

   ```bash
   npm run dev
   ```

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Unit and component tests (Vitest, Testing Library) |
| `npm run lint` / `npm run typecheck` | ESLint, TypeScript |
| `npm run build` | Production build |
| `npm run db:types` | Regenerates `src/lib/supabase/database.types.ts` from the linked project |

CI runs lint, typecheck, tests and build on every pull request and push to `main`.
