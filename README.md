# Taskflow

A small full-stack task manager: register, sign in, and manage your own tasks. Built as a focused MVP — enough structure to be maintainable, without layering patterns this size does not need.

## Overview

Taskflow is a single-user-per-account todo app. The backend exposes a JSON API with JWT auth; the frontend is a React SPA that talks to it over HTTP. Tasks are scoped to the signed-in user — you cannot read or change someone else's items.

It runs locally with SQLite and default dev settings. That is the intended use case: development, demos, and code review — not a hardened deployment target.

## Tech stack

| Layer | Choices |
|-------|---------|
| API | ASP.NET Core 8, EF Core, SQLite |
| Auth | JWT (Bearer), BCrypt password hashes |
| UI | React 18, TypeScript, Vite |
| UI extras | React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS |
| Tests | xUnit, `WebApplicationFactory` integration tests |

## Getting started

**Prerequisites:** .NET 8 SDK, Node.js 18+

### Backend

```bash
cd backend
dotnet restore
dotnet run
```

The API URL is printed in the console (often `http://localhost:5068`). On first run, EF creates `taskflow.db` in the backend folder via `EnsureCreated()`.

If you previously ran an older schema, delete `backend/taskflow.db` once and restart so tables match the current models.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional; defaults match local API
npm run dev
```

Open `http://localhost:5173`. Sign up, then use **Tasks** to create and manage items.

### Tests

```bash
dotnet test backend/tests/Taskflow.Api.Tests/Taskflow.Api.Tests.csproj
```

Seventeen integration tests cover auth validation, 401 without a token, task ownership (404 for other users' tasks), and input validation. Stop a running `dotnet run` instance first if the build complains about a locked `Taskflow.Api.exe`.

## Environment variables

Backend settings can come from `appsettings.json`, environment variables, or both. The env vars below override or mirror common config keys.

| Variable | Purpose | Default / example |
|----------|---------|-------------------|
| `TASKFLOW_CONNECTION_STRING` | SQLite connection | `Data Source=taskflow.db` |
| `TASKFLOW_ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:5173` |
| `TASKFLOW_JWT_KEY` | HMAC signing key (use 32+ chars in any shared environment) | Dev placeholder in `appsettings.json` |

`appsettings.json` also defines `Jwt:Issuer`, `Jwt:Audience`, and `Jwt:ExpiresHours` (default 8). There is no separate env var for expiry today — change `appsettings` or extend config if you need that.

**Frontend** (`frontend/.env`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://localhost:5068` |

See `backend/.env.example` and `frontend/.env.example` for copy-paste templates.

## API overview

Base path: `/api`. JSON request/response bodies unless noted.

### Auth (no token required except `/me`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account → `{ token, user }` |
| `POST` | `/auth/login` | Sign in → `{ token, user }` |
| `GET` | `/auth/me` | Current user (Bearer token required) |

### Tasks (Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks` | List current user's tasks (newest first) |
| `POST` | `/tasks` | Create task (`title`, optional `description`, `dueDate`) |
| `GET` | `/tasks/{id}` | Get one task |
| `PATCH` | `/tasks/{id}` | Partial update (`title`, `description`, `dueDate`, `dueDateChanged`, `isCompleted`) |
| `PATCH` | `/tasks/{id}/toggle` | Flip `isCompleted` |
| `DELETE` | `/tasks/{id}` | Delete task → `204` |

Validation highlights: title required, max 200 chars; description max 1000 chars; invalid ids return `400`; tasks owned by another user return `404` (not `403`) so ids are not leaked.

Errors usually look like `{ "message": "..." }`.

## Authentication

1. **Register or login** — email is trimmed and lowercased; password is hashed with BCrypt before storage. The API never returns `PasswordHash`.
2. **JWT** — the server issues a signed token (default 8-hour lifetime) with user id and email claims.
3. **Client** — the SPA stores the token in `localStorage` and sends `Authorization: Bearer <token>` on API calls. Protected routes redirect to login when there is no session.
4. **Server** — `[Authorize]` on `TasksController`; task queries filter by `UserId` from the token. Cross-user access attempts get `404` on single-task operations.

This is a standard SPA + stateless API setup. Refresh tokens, cookie-based sessions, and server-side session stores are not implemented.

## Architecture decisions

- **Controllers own the flow** — validation, EF calls, and HTTP responses live in `AuthController` and `TasksController`. No repository or CQRS layer; fewer files to navigate for an app this size.
- **EF Core + SQLite** — one `ApplicationDbContext`, models in `Models/`, relationships configured in `OnModelCreating`. `EnsureCreated()` at startup instead of migrations for speed and simplicity in a take-home context.
- **Thin service layer** — only `JwtService` is extracted; everything else stayed inline until it justified a split.
- **Frontend layout** — `api/client.ts` for HTTP + auth header; `AuthContext` for session; React Query for server state on the tasks page; forms use Hook Form + Zod for client-side checks before hitting the API.
- **Security tests** — integration tests hit the real pipeline (middleware, auth, EF) with an in-memory SQLite connection swapped in via `WebApplicationFactory`.

## Tradeoffs

| Choice | Upside | Downside |
|--------|--------|----------|
| SQLite file DB | Zero setup, easy to reset | Not ideal for concurrent writes or multi-instance deploys |
| `EnsureCreated()` vs migrations | Fast to run and review | Schema changes are manual; no versioned migration history |
| JWT in `localStorage` | Simple SPA wiring | XSS could expose the token; httpOnly cookies would be safer |
| 404 for other users' tasks | Avoids confirming task ids exist | Slightly less explicit than `403 Forbidden` |
| Fat controllers | Readable end-to-end in one file | Will feel cramped if the API grows a lot |

## Intentionally left out

- Email verification, password reset, OAuth
- Refresh tokens and token revocation
- Role-based access (only "logged-in owner of data")
- EF migrations, seed scripts, Docker/CI wiring in this repo
- Repository/unit-of-work abstractions, MediatR, AutoMapper
- Pagination, full-text search, attachments, teams/sharing
- Rate limiting, structured audit logs, OpenAPI/Swagger UI
- E2E browser tests (API integration tests only)

None of that is an oversight for "MVP" — it is scope control.

## With more time, I would

- Add **EF migrations** and a proper deploy story (Postgres or SQL Server instead of SQLite for anything shared).
- **Refresh tokens** or short-lived access tokens + secure cookie storage on the frontend.
- **Swagger** for API discovery and a small Postman/HTTP file for reviewers.
- **E2E tests** (Playwright) for login → create task → toggle → delete.
- Split **application services** out of controllers once endpoints multiply; keep controllers thin.
- **Pagination and filtering** on `GET /tasks` when lists grow.
- Hardening pass: rate limits on auth endpoints, stricter email validation, health checks, and quieter test logging.

## Project layout

```
taskflow-THT/
├── backend/
│   ├── Controllers/       # Auth + Tasks API
│   ├── Data/              # ApplicationDbContext
│   ├── Models/            # User, TaskItem
│   ├── Services/          # JwtService
│   └── tests/             # Taskflow.Api.Tests (integration)
└── frontend/
    └── src/
        ├── api/           # HTTP client
        ├── auth/          # Context, protected routes
        ├── pages/         # Home, Login, Register, Tasks
        └── lib/           # config, dates, errors, auth storage
```

## Data model

- **User** — `Id`, `Email` (unique), `PasswordHash`, `CreatedAt`
- **TaskItem** — `Id`, `Title`, `Description`, `DueDate`, `IsCompleted`, `CreatedAt`, `UpdatedAt`, `UserId` → `User` (cascade delete)

---

Questions or setup issues: check that CORS origins include your frontend URL and that `VITE_API_BASE_URL` matches the API port from `dotnet run`.
