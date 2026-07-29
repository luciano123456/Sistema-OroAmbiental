# AGENTS.md

## Cursor Cloud specific instructions

This is a single **.NET 6 / ASP.NET Core MVC** web application (`Sistema Oro Ambiental`, an
ERP-style system for an environmental/recycling company). It is a layered solution
(`Application` = runnable web app, `BLL`, `DAL`, `Models`, `DataBaseScripts`) backed by
**Microsoft SQL Server**. There is no test project, no `docker-compose`, and no `Makefile`.

### Services

| Service | Required | How to run | Port |
|---------|----------|------------|------|
| SQL Server 2022 (Docker container `sqlserver`) | Yes | see below | 1433 |
| ASP.NET Core web app (`SistemaOroAmbiental.Application`) | Yes | `dotnet run` | 5007 (http), 7062 (https) |

### Environment already provided by the VM snapshot

- **.NET 6 SDK** is installed at `/usr/local/dotnet` and symlinked to `/usr/local/bin/dotnet`.
- **Docker** is installed. The daemon is NOT auto-started; start it if `docker info` fails:
  `sudo dockerd` (run in a background tmux session). It is configured for `fuse-overlayfs`
  with the containerd snapshotter disabled (required in this VM).
- A **SQL Server 2022** container named `sqlserver` (SA password `OroAmbiental2025!`) with the
  `Sistema_OroAmbiental` database, full schema, and a seeded admin user. Start it if stopped:
  `sudo docker start sqlserver`.
- `~/.bashrc` exports `ASPNETCORE_ENVIRONMENT=Development`, the dotnet `PATH`, and
  `ConnectionStrings__SistemaDB` pointing at the local SQL Server. New interactive shells pick
  these up automatically.

### Connection string (non-obvious)

The checked-in `appsettings.json` points `ConnectionStrings:SistemaDB` at a Windows machine
(`DESKTOP-3MT5F5F`, Integrated Security) and will NOT work on Linux. Do NOT edit that file.
Instead the connection is overridden via the `ConnectionStrings__SistemaDB` environment
variable (set in `~/.bashrc`). Its password contains `!`, so in an interactive bash shell run
`set +H` (or use single quotes) before commands that reference it to avoid history expansion.

### Build / lint

There is no separate linter; the build (with nullable warnings) is the check.

```bash
dotnet restore SistemaOroAmbiental.sln   # also run automatically by the startup update script
dotnet build SistemaOroAmbiental.sln     # 0 errors expected (~44 nullable/style warnings)
```

### Run the web app (dev mode)

```bash
cd SistemaOroAmbiental.Application
dotnet run --no-launch-profile --urls "http://localhost:5007;https://localhost:7062"
```

- HTTP (5007) 307-redirects to HTTPS (7062) because of `UseHttpsRedirection()`; test against
  `https://localhost:7062` (self-signed dev cert, use `curl -k`).
- Default route is the login page (`/Login`). Seeded credentials: **user `admin` / password `Admin123!`**.
- Razor runtime compilation is enabled, so view (`.cshtml`) edits are picked up without a rebuild.

### Recreating the database from scratch (schema not in repo)

The repo does NOT contain a full base-schema SQL script; the numbered scripts under
`SistemaOroAmbiental.DataBaseScripts/Scripts/` are incremental ALTERs for an existing DB. The
complete schema is defined by the EF Core model in
`SistemaOroAmbiental.DAL/DataContext/SistemaOroAmbientalContext.cs`, so a fresh database is
created with EF Core `Database.EnsureCreated()` (not `dotnet ef` migrations — there are none).
If you ever need to rebuild it: create the `Sistema_OroAmbiental` database, then run a small
program/DbContext call to `EnsureCreated()` and insert at least one `Usuarios_Estados`, one
`Usuarios_Roles`, and one `Usuarios` row (password hashed with ASP.NET Core
`PasswordHasher<User>`, which `LoginController` uses to verify).
