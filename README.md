# Spoonfury

[Human Written!]
Spoonfury is a recipe-first social platform. Users can discover, create, and **fork** recipes, building curated digital recipe books to share.

## Core Features
- **Recipe Forking**: Clone recipes and make personal tweaks (constrained to ±3 ingredient changes).
- **Stir the Pot**: A public explore feed to discover the latest community recipes.
- **Easy Sharing**: Share recipes instantly via QR codes, WhatsApp, or direct URL copy.
- **Instacart Integration**: Order ingredients directly from a recipe page.
- **Recipe Books**: Organize and share collections of recipes.
- **Mobile-First Design**: Optimized for use in the kitchen.

## Project Architecture

The project follows a modern full-stack architecture optimized for deployment on low-power devices like the NVIDIA Jetson.

### Backend
- **Framework**: [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: [Django Allauth](https://django-allauth.readthedocs.io/)
- **Location**: `/backend`

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Location**: `/frontend`

### Infrastructure
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Deployment**: Optimized for NVIDIA Jetson (Ubuntu) using `deploy.sh`.

---

## AI-Driven Development Workflow

This project is built using a hybrid AI workflow, leveraging both Claude and Gemini.

### Claude Integration
- **Role**: Primarily used for initial scaffolding, large feature implementations, and complex refactorings.
- **Guidance**: See `CLAUDE.md` for instructions and project conventions specific to Claude.

### Gemini Integration
- **Role**: Used for ongoing development, code reviews, and specialized tasks.
- **Guidance**: See `GEMINI.md` for Gemini-specific context and the use of the `gemini-superpowers` extension.

### Developer Workflow
1. **Planning**: Design specs (`*.spec.md`) and implementation plans (`*.impl.md`) live in `docs/plans/`.
2. **Context**: Targeted architectural scopes are in `docs/context-scopes/`.
3. **Implementation**: AI agents follow the respective `CLAUDE.md` or `GEMINI.md` guides.
3. **Verification**: Backend tests use `pytest`. Frontend is verified via Vite dev server.
4. **Deployment**: Uses Docker Compose for consistent environments across development and production.

---

## How `/docs/` Is Organized

The `docs/` folder is the project's knowledge base — for both humans and AI agents.

```
docs/
  context-scopes/        Standing reference. Understand the system before reading plans.
    core-flow.md           Fork & book data model relationships
    backend.md             Django patterns, models, ViewSets, dev server setup
    frontend.md            React architecture, routing, state, components
    api-reference.md       REST API endpoints, request/response shapes

  plans/                 Feature lifecycle. Every feature gets a spec + impl pair.
    active/                Work in progress or queued next
    completed/             Shipped and archived

  references/            External templates and reference material
  snapshots/             Point-in-time UI/state captures
  TODO.md                Deferred backlog items
  TODO-future-shopping.md  Shopping list enhancement ideas
```

**Naming convention**: `YYYY-MM-DD-{version}-{feature}.spec.md` (design — what & why) and `*.impl.md` (implementation — step-by-step agent work order). The date prefix gives chronological ordering at a glance. When a feature ships, both files move from `active/` to `completed/`.

**Entry points**: AI agents start at `CLAUDE.md` (or `GEMINI.md`). Humans start here.

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

### Local Setup
Refer to `CLAUDE.md` for detailed build and run commands for both backend and frontend.

### Docker Deployment
```bash
docker compose up --build -d
./deploy.sh
```
