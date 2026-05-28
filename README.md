# Taskflow MVP

A practical full-stack task manager with:

- Backend: ASP.NET Core Web API (.NET 8), EF Core, SQLite
- Frontend: React, TypeScript, Vite, TailwindCSS

The structure is intentionally simple and avoids heavy architecture patterns.

## Project Structure

- `backend` - Web API + SQLite data
- `frontend` - React app

## Run Backend

1. Install .NET 8 SDK
2. From `backend`:

```bash
dotnet restore
dotnet run
```

API default URL is usually `http://localhost:5068` (or as shown by `dotnet run`).

### Backend env vars

Use environment variables directly, or copy from `.env.example` into your own environment setup:

- `TASKFLOW_CONNECTION_STRING` (example: `Data Source=taskflow.db`)
- `TASKFLOW_ALLOWED_ORIGINS` (comma-separated, example: `http://localhost:5173`)

## Run Frontend

1. Install Node.js 18+
2. From `frontend`:

```bash
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

### Frontend env vars

Copy `frontend/.env.example` to `frontend/.env` and adjust if needed:

- `VITE_API_BASE_URL` (example: `http://localhost:5068`)

## Notes

- No repository pattern
- No CQRS
- No unnecessary abstraction layers
- CRUD logic lives directly in the controller for speed/readability

## Data Model

- `User`: `Id`, `Email`, `PasswordHash`, `CreatedAt`
- `TaskItem`: `Id`, `Title`, `Description`, `DueDate`, `IsCompleted`, `CreatedAt`, `UpdatedAt`, `UserId`

`TaskItem` has a required relationship to `User` (`User 1 - many TaskItems`).

If you already ran an older version of the app, delete `backend/taskflow.db` once so the new schema is created cleanly.