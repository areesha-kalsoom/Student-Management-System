# Forma — private student management workspace

A responsive, full-stack student records application with account registration, secure sessions, private per-user student data, dashboard analytics, custom fields, server-side directory search, and CSV import/export.

> **Stack note:** This repository was supplied as a Next.js App Router + PostgreSQL + Drizzle project. The implementation preserves that working foundation, so it is **not a MERN application**: there is no separate Vite frontend, Express server, MongoDB, or Mongoose. It also follows the supplied TypeScript Next.js starter. The app runs as one same-origin Next.js application on port `3000`. Replacing the platform-managed database/runtime with MERN would require a separate project migration and is intentionally not represented as completed here.

This is a local-development and learning project. Do not enter real student information, expose the app publicly, or use it as a production student-information system without a separate security, privacy, and operational review.

## Features

- Public welcome, terms, privacy, registration, and login pages.
- Independent user accounts with normalized unique emails and bcrypt password hashes.
- Opaque, random, database-backed sessions in HTTP-only, `SameSite=Lax` cookies; seven-day expiry; logout revokes the current session.
- Server-side owner checks for students, custom field definitions and values, dashboard statistics, search, import, and export.
- Student create/read/update/delete, profile cards, dedicated profile pages, and confirmation before deletion.
- Standard profile fields: name, roll number, date of birth, gender, contact details, class, department, enrollment date, status, notes.
- Per-user custom fields: short/long text, number, date, yes/no, single/multi-select, email, phone, and URL. Field definitions are owner-scoped; student values persist in a JSONB column keyed by stable field IDs.
- Search, class/department/status/gender/enrollment-date/custom-field filters, allowlisted sorting, and server-side pagination (maximum 50 per page).
- Dashboard summary and class distribution computed from real records belonging to the signed-in user.
- CSV file preview, column mapping, server-side dry-run validation, row-level errors, duplicate detection, and import of valid rows (maximum 500 rows per request).
- All-record and filtered CSV export; custom fields are included only when configured as exportable, and spreadsheet formula-like values are escaped.
- Profile update, password change with revocation of other sessions, and password-confirmed account deletion with database cascade behavior.
- Automated two-account API test covering cross-user student, dashboard, custom-field, export, and logout isolation.

## Technology

- Next.js App Router, React, and the same-origin REST route handlers.
- PostgreSQL and Drizzle ORM.
- TypeScript/TSX, Tailwind CSS v4 import plus a small design-system stylesheet, and Lucide React icons.
- Zod server-side validation and `bcryptjs` password hashing.
- Native browser `fetch` for same-origin API requests.

The browser does not store authentication tokens in local storage. The session token is random, held in an HTTP-only cookie, and stored as a SHA-256 hash in PostgreSQL.

## Prerequisites

- Windows 10/11, macOS, or Linux.
- Node.js 20.9 or newer and npm. Check with `node --version` and `npm --version`.
- Git for version control.
- PostgreSQL 14 or newer running locally, or a development-only PostgreSQL-compatible database. Never use production student data.

MongoDB, Vite, and Express are not used by this repository because the provided project runtime is PostgreSQL/Drizzle.

## Project structure

```text
.
├── src/
│   ├── app/
│   │   ├── api/                 # Auth, account, students, dashboard, fields, CSV, health
│   │   ├── dashboard/           # Real, owner-scoped summary
│   │   ├── students/            # Directory, create, profile, edit pages
│   │   ├── fields/              # Custom field builder
│   │   ├── data/                # CSV import/export center
│   │   ├── settings/            # Profile, password, account removal
│   │   ├── login/ register/     # Public authentication pages
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx             # Public welcome page
│   ├── components/              # Auth context, app shell, student form/cards, UI primitives
│   ├── db/                      # Drizzle schema and PostgreSQL client
│   └── lib/                     # Server auth/validation/CSV and browser helpers
├── tests/
│   └── privacy.integration.test.mjs
├── drizzle.config.ts            # Reads DATABASE_URL from environment
├── .env.example                 # Placeholder only; no real secrets
├── .gitignore
└── README.md
```

## Local setup — Windows CMD

Run commands from the repository root unless a step says otherwise. Keep the backend/app and PostgreSQL running in separate processes as described below.

### 1. Start and verify PostgreSQL

Install PostgreSQL locally if needed. The Windows service name depends on the installed version. From an administrator CMD, use the service name shown in Windows Services, for example:

```cmd
net start postgresql-x64-16
```

Then verify the client and connection. `pg_isready` is installed with many PostgreSQL distributions:

```cmd
psql --version
pg_isready -h 127.0.0.1 -p 5432
```

Create a development database if it does not already exist (replace the role if yours differs):

```cmd
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE student_management_dev;"
```

If PostgreSQL reports that the database already exists, do not drop or reset it. Use its existing name in `DATABASE_URL`. If local installation is unavailable, create a development-only database in MongoDB Atlas is **not** applicable; use a PostgreSQL provider instead. For a managed PostgreSQL development database, use the provider’s connection string and TLS requirements.

### 2. Configure environment variables

The application reads `DATABASE_URL` on the server. Do not put database credentials in a `NEXT_PUBLIC_*` or browser environment variable.

If you do **not** already have a `.env` file, copy the placeholder and edit it:

```cmd
copy .env.example .env
notepad .env
```

If `.env` already exists, **do not overwrite it**; open it and add or update `DATABASE_URL` carefully. For a local install, use your own PostgreSQL password and database name, for example:

```text
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/student_management_dev
```

URL-encode special characters in the password. Keep `.env` private; `.gitignore` excludes it. No `SESSION_SECRET` is needed: authentication uses random opaque sessions stored server-side. The example file contains only a placeholder connection string.

### 3. Install dependencies and prepare tables

```cmd
npm install
npx drizzle-kit push --config=drizzle.config.ts
```

Drizzle Kit reads `DATABASE_URL` from `.env` through `dotenv/config`. Review any schema prompt before accepting it. The app uses tables prefixed `sms_`; do not use destructive reset commands or approve unrelated drops. Existing user data should not be reset to resolve a configuration problem.

### 4. Start the application

```cmd
npm run dev
```

Open a browser at **http://localhost:3000**. Registration creates a private workspace; sign in and add fictional test students. The app and REST API share one origin, so there is no separate `localhost:5173` frontend or `localhost:5000` Express server.

### 5. Production build and checks

From the project root:

```cmd
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

For the platform-managed preview, the runtime also checks `/api/health`. Do not run a public deployment as part of this project.

## API reference

Protected endpoints require the session cookie created by registration or login. Requests changing state enforce same-origin checks when an `Origin` header is supplied. A missing record and a record owned by another user both return `404`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register, hash password, create session |
| `POST` | `/api/auth/login` | Sign in; generic invalid-credential response |
| `POST` | `/api/auth/logout` | Revoke current session and clear cookie |
| `GET` | `/api/auth/me` | Return current account or `401` |
| `POST` | `/api/auth/change-password` | Change password and revoke other sessions |
| `PATCH` / `DELETE` | `/api/account` | Update name / delete account after password confirmation |
| `GET` / `POST` | `/api/students` | Owner-scoped list / create |
| `GET` / `PUT` / `DELETE` | `/api/students/:id` | Owner-scoped student detail / update / delete |
| `GET` | `/api/dashboard/stats` | Owner-scoped summary and class groups |
| `GET` / `POST` | `/api/custom-fields` | List / create custom fields for current owner |
| `PUT` / `PATCH` | `/api/custom-fields/:id` | Edit / archive or restore an owned field |
| `PUT` | `/api/custom-fields/reorder` | Reorder active owned fields |
| `POST` | `/api/students/import` | Server-side CSV row dry run or import commit |
| `GET` | `/api/students/export` | Owner-scoped CSV export; optional query filters |
| `GET` | `/api/health` | PostgreSQL health check |

Student list query options include `search`, `class`, `department`, `status`, `gender`, `from`, `to`, `sort`, `direction`, `page`, `limit`, and `custom_<field-id>` for an owner-configured filterable field. Sort columns are allowlisted; page size is capped at 50.

## Authentication and privacy notes

- Registration requires a 12-character minimum password and accepted terms.
- Email addresses are trimmed, lowercased, and unique in PostgreSQL.
- Passwords are bcrypt-hashed (never returned by an API response).
- The cookie is HTTP-only, `SameSite=Lax`, seven days, and marked `Secure` when `NODE_ENV=production`.
- Database sessions are opaque and hashed at rest. Logout deletes the matching session; password changes delete existing sessions before issuing a new one.
- Every protected database query derives `ownerId` from the validated session, never from client input. Student and field IDs are always combined with the current owner ID.
- New accounts have no administrator privileges. There is no sharing or collaboration.
- In-memory login/registration rate limits are intended for a single local process. They are not a distributed rate-limiting service.
- No email provider is configured, so email verification, password-reset email, and recovery links are not implemented or advertised as available.

## CSV workflow

1. Choose a `.csv` file (client size check 1.4 MB; maximum 500 rows).
2. Preview rows and map headings to standard or active custom fields.
3. Run server-side validation to see valid rows and row-numbered errors.
4. Confirm the import. Valid rows are inserted under the authenticated owner; invalid/duplicate rows are skipped and reported.
5. Export all records or apply search, status, class, department, and enrollment-date filters in the export center.

Standard columns are mapped by name, roll number, class, and enrollment date; optional fields can remain unmapped. Custom fields are included in exports only when their owner enables export. The server does not accept ownership, account, or session properties as student fields. Spreadsheet formula-leading text is prefixed safely in CSV output.

## Postman testing

1. Start PostgreSQL and `npm run dev`.
2. Create a request to `POST http://localhost:3000/api/auth/register` with JSON body such as:
   ```json
   {"name":"Demo User","email":"demo@example.test","password":"Local-Only-Password-2026!","termsAccepted":true}
   ```
3. Postman should retain the `sms_session` cookie for `localhost`. Check its cookie manager. Do not copy a real session cookie into source code or a shared collection.
4. Call `GET /api/auth/me`, then create a student using `POST /api/students` with a JSON body matching the student fields. Use `GET /api/students` and `GET /api/dashboard/stats` to verify results.
5. Register a second test account and repeat. Try the first user’s student ID with the second cookie: the expected response is `404`. The same roll number may be used by two different owners.
6. Use `POST /api/auth/logout`, then verify `GET /api/auth/me` returns `401`.

Postman state-changing requests with an `Origin` header must use the same origin. Requests from a same-origin browser meet this check automatically. Avoid using real personal data during demos.

## Automated privacy test

With PostgreSQL tables prepared and the app running at `http://localhost:3000`, open a second CMD window in the repository root:

```cmd
set SMS_BASE_URL=http://localhost:3000
node --test tests\privacy.integration.test.mjs
```

The test registers two unique fictional accounts, checks cross-account student and custom-field access, dashboard counts, duplicate rules, export isolation, and logout, then attempts to delete its test accounts. Run it only against a development database. If an interrupted test leaves fixtures behind, delete those test accounts from the app using their test credentials.

## Troubleshooting

- **`DATABASE_URL is required`** — Confirm `.env` exists at the repository root and contains `DATABASE_URL=...`.
- **Connection refused / health check fails** — Start PostgreSQL, verify the port with `pg_isready`, and check host/port/database/user/password. Do not paste credentials into frontend variables.
- **Database does not exist** — Create the development database or update the URL to a database that already exists. Do not drop other databases.
- **Drizzle cannot read config** — Run the command from the project root and include `--config=drizzle.config.ts`.
- **Port 3000 is busy** — Stop the other local process or run `npm run dev -- -p 3001`, then set `SMS_BASE_URL=http://localhost:3001` for tests.
- **Session appears lost** — Use the same host for all requests (`localhost` versus `127.0.0.1` have separate cookie jars), confirm cookies are enabled, and sign in again.
- **CSV import reports errors** — Check exact date format `YYYY-MM-DD`, required columns, custom selection values, and duplicate roll/email values. Fix the CSV or mapping and preview again.
- **Password recovery** — Email delivery is not configured; use a known test account or delete it from the local database through the UI.

## GitHub readiness

Before committing, inspect the staged file list and verify that no `.env`, database dump, session cookie, real student record, or generated output is included. `.gitignore` excludes local environment files and build artifacts; keep `.env.example` placeholder-only.

Run from the project root in Windows CMD:

```cmd
git init
git branch -M main
git status --short
git add .
git diff --cached --name-only
git diff --cached
git commit -m "Build private student management workspace"
```

Create a **private** empty repository on GitHub in the browser. Do not include a generated README/license if you already have one locally. Then connect and push (replace the URL):

```cmd
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Check `git diff --cached --name-only` before every commit. Never upload `.env`, credentials, test cookies, real student data, database backups, `node_modules`, or `.next` output. Keep the repository private while it is unfinished; change visibility only after reviewing the contents and removing private information.

## Known limitations and next steps

- This implementation preserves the provided Next.js/PostgreSQL/Drizzle foundation instead of the requested MERN/Vite/Express/MongoDB stack. It also uses the supplied TypeScript project rather than converting it to JavaScript.
- Authentication rate limits are per-process in-memory counters; no email verification/recovery service is configured.
- CSV input is read by the browser and sent as mapped JSON to the same-origin server; this is intended for small local imports, not large file processing.
- Import is row-by-row, not a multi-row PostgreSQL transaction; successful rows remain imported if other rows fail.
- Student photos/files, collaboration, audit history, saved filter presets, password recovery, and account email verification are not included.
- The integration test must be run by the developer; its inclusion alone is not a test result. No public deployment is included.

Recommended next steps: run the database setup and application locally, execute the privacy test with two accounts, review `git status`, add any university rubric-specific features, and request a dedicated migration plan if an actual MERN application is required.
