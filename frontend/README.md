# Spoonfury Frontend

React 19 single-page application built with Vite, Tailwind CSS 4, and Shadcn UI.

## Core Technologies
- **Framework**: React 19 (using the new `use` hook patterns where applicable)
- **Styling**: Tailwind CSS 4 (using the `@theme` and `@plugin` syntax)
- **Routing**: React Router 7
- **UI Components**: Shadcn UI (Radix primitives)
- **Markdown**: `react-markdown` with Tailwind Typography

## Key Directories
- `src/pages/`: Full-page route components.
- `src/components/`: Reusable UI components.
- `src/contexts/`: Global state (Auth, etc.).
- `src/lib/`: API clients and utility functions.

## Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
The build artifacts will be in `dist/`. In production, these are served by the Django backend.

## Conventions
- **Naming**: PascalCase for components, camelCase for hooks and utilities.
- **Styling**: Prefer Tailwind utility classes. Avoid custom CSS unless absolutely necessary (see `index.css`).
- **Icons**: [Lucide React](https://lucide.dev/icons/) is the standard icon set.
