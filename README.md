# Spoonfury 🥄💢
[🙆🏼Human written!!]

Spoonfury is an [🚧🏗️under construction🏗️🚧] recipe-first social platform designed to bring joy and efficiency back to cooking and meal planning. No fluff, no endless stories or ads —— just recipes, ingredients, and method.

## Reason to be
Spoonfury is built on aggressive simplicity, aiming to bring utility to the cooking experience. Leveraging Twitter-style descriptions followed immediately by ingredients and instructions, Spoonfury aims to empower users to cook and iterate through clarity and utility.

The core value propositions are:

- **Organization**: Your personal cookbook is a living document! Recipes aren't just static text, but editable, tweakable, and shareable! 
- **The Forking Standard**: Inspired by Github, users can FORK a recipe they love, and edit it as they please. If the forked recipe is unique enough, it can be made public! (This needs thought, unique thresholds are not yet defined. But it would be chaos for recipes to be forked a million times and on public accessible database!) 
- **Aggressive Simplicity**: Straight to the point. Zero tolerance for fluffy stories about how egg-nog transformed your life one Christmas eve. Spoonfury is a zero distractions tool for recipe hosting and meal planning.
- **Convenience**: Go from "I want to cook this recipe" to "Ingredients are on the way!" in seconds. Our planned Instacart integration will let you order recipe ingredients for quick pickup or delivery.

### Core Features
- **Recipe Forking**: Clone recipes and make personal tweaks (constrained to ±3 ingredient changes).
- **Stir the Pot**: A public explore feed to discover the latest community recipes.
- **Easy Sharing**: Share recipes instantly via QR codes, WhatsApp, or direct URL copy.
- **Instacart Integration**: Order ingredients directly from a recipe page. (NOT YET FINALIZED)
- **Recipe Books**: Organize and share collections of recipes.
- **Mobile-First Design**: Optimized for use in the kitchen. (NEED TO ENFORCE THIS!)

# Project Architecture

The project follows a modern full-stack architecture.

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
- **Deployment**: Temporarily optimized for NVIDIA Jetson (Ubuntu) using `deploy.sh`.

---

## 🤖 AI-Driven Development Workflow

This project leverages an AI-forward workflow for development and documentation. Models used are mostly Claude and Gemini.

### Claude Integration
- **Role**: Used for initial scaffolding, large feature implementations, and complex refactorings.
- **Guidance**: See `CLAUDE.md` for instructions and project conventions specific to Claude.

### Gemini Integration
- **Role**: Used for ongoing development, code reviews, UI/UX vibes, and specialized tasks.
- **Guidance**: See `GEMINI.md` for Gemini-specific context and the use of the `gemini-superpowers` extension.

### Developer Workflow
Documentation is all housed in `/docs/`. AI plays a strong role to maintain this folder. Recommend strong hand holding.
1. **Planning**: All feature implementations are found in `docs/plans/`. After enough prompting about "what the human wants", AI is instructed to document and follow Design specs (`*.spec.md`) and Implementation plans (`*.impl.md`). Spend time making sure your vision is properly prompted before executing, you won't regret it.
2. **Context**: Architectural scopes are in `docs/context-scopes/`. These are important, as AI context is established here first!
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

  visual-mockups/        Interactive HTML mockups from UI brainstorming sessions
  references/            External templates and reference material
  snapshots/             Point-in-time UI/state captures
  CHANGELOG.md           Human-first dev log — what changed, when, and why
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
