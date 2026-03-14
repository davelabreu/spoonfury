# GEMINI.md

**`CLAUDE.md` is the single source of truth for this project.** Read it first. This file contains only Gemini-specific notes that differ from Claude Code's behavior.

## Quick Start for Gemini

1. Read `CLAUDE.md` — full project context, architecture, conventions, design docs
2. Read `docs/context-scopes/core-flow.md` — fork + book data model
3. Read `docs/plans/` — latest implementation status

## Gemini-Specific Notes

### Tool Name Mapping

Gemini CLI uses different tool names than Claude Code. See `references/codex-tools.md` if available for the full mapping. Key differences:
- File reading/writing/editing tools are functionally equivalent
- MCP tools activate via `activate_skill` rather than the `Skill` tool

### Skills / Superpowers

Claude Code uses a `Skill` tool to invoke workflow skills (brainstorming, TDD, debugging, etc.). In Gemini CLI, skills activate via the `activate_skill` tool. The skill content and workflows are the same — only the invocation mechanism differs.

### shadcn/studio MCP

Same instructions as in `CLAUDE.md`. The `components.json` is at `frontend/components.json`.
