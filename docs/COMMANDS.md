# Dev Commands Cheat Sheet

Quick reference for starting, stopping, and testing Spoonfury locally.

---

## 1. Database (Docker — WSL only)

**Always use WSL or Linux for Docker commands. Never run docker from the Windows shell.**

```bash
# Start Postgres (from WSL, adjust mount path as needed)
cd /mnt/g/Projects/dev/1.work/Spoonfury
docker compose -f docker-compose.dev.yml up -d

# Stop Postgres
docker compose -f docker-compose.dev.yml down
```

Postgres 16 runs on `localhost:5432`. DB / user / password are all `spoonfury`.

---

## 2. Backend (Django)

```bash
cd backend

# Windows
..\.venv\Scripts\python manage.py runserver 0.0.0.0:8000

# Linux / WSL
../../.venv/bin/python manage.py runserver 0.0.0.0:8000
```

Use `0.0.0.0` to allow mobile device testing on the local network.

**Apply migrations** (run if you've pulled new model changes):
```bash
# Windows
..\.venv\Scripts\python manage.py migrate

# Linux / WSL
../../.venv/bin/python manage.py migrate
```

**Make new migrations** (after changing models):
```bash
# Windows
..\.venv\Scripts\python manage.py makemigrations

# Linux / WSL
../../.venv/bin/python manage.py makemigrations
```

---

## 3. Frontend (Vite)

```bash
cd frontend

npm run dev            # localhost:5173 (local only)
npm run dev:network    # 0.0.0.0:5173 (mobile testing)
npm run build          # TypeScript + Vite production build
```

Vite proxies `/api/*` and `/media/*` to `http://localhost:8000`.

---

## 4. Tests

```bash
cd backend

# Windows
..\.venv\Scripts\pytest

# Linux / WSL
../../.venv/bin/pytest

# Run a single test file
..\.venv\Scripts\pytest spoonfury/apps/recipes/tests/test_fork.py

# Run with output (no capture)
..\.venv\Scripts\pytest -s
```

Frontend tests:
```bash
cd frontend
npm run test
```

---

## 5. Worktree Dev Servers

When working on a feature branch in `.worktrees/<branch>/`, run servers **from inside the worktree** — not from the main repo root (that would serve `master` code).

```bash
# Frontend
cd .worktrees/<branch>/frontend
npm run dev

# Backend — migrate first if the branch adds new models
cd .worktrees/<branch>/backend
../../.venv/Scripts/python manage.py migrate
../../.venv/Scripts/python manage.py runserver 0.0.0.0:8000
```

---

## 6. Deploy to Jetson

```bash
cp .env.example .env   # fill in SECRET_KEY and DB_PASSWORD
./deploy.sh            # interactive menu — app served at :8055
```
