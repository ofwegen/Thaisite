# Agent Guidelines

This repository is a React + Vite app for a Thai learning platform. Use this
file to orient agentic changes and keep them consistent with existing patterns.

## Commands

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Lint all files:

```bash
npm run lint
```

Lint a single file (no npm script for this):

```bash
npx eslint src/App.jsx
```

Tests:

- No test runner is configured in `package.json`.
- There is no command for running a single test because tests are not present.

Content scraping (optional utility script):

```bash
node scrape.mjs
```

Notes:

- `scrape.mjs` uses `fetch` and `TextDecoder`; run with Node 18+.

## Agent Rules Imports

- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.

## Project Layout

- `src/App.jsx`: app shell and routing between sidebar and content.
- `src/components/`: UI components (e.g., `DndExercise`, `Sidebar`).
- `src/hooks/useProgress.js`: localStorage + URL hash progress logic.
- `src/index.css`: global styles and design system tokens.
- `src/assets/content.json`: scraped content data.
- `exercises.json`: per-exercise description overrides.
- `scrape.mjs`: content extraction utility (not used at runtime).

## Code Style

General:

- Use ES modules (`import` / `export`) everywhere.
- React function components and hooks only (no class components).
- Prefer named exports for shared components; `App` is default export.
- Keep JSX readable; break long props across lines like existing components.
- Use semicolons in JS/JSX (current files do).
- Respect each file's indentation style when editing it.

Imports:

- Order: third-party packages, then local modules.
- Keep related imports grouped (React, libs, then local).
- Examples:

```js
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
```

Naming:

- Components: `PascalCase` (e.g., `DndExercise`).
- Hooks: `useX` (e.g., `useProgress`).
- Functions/variables: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` when truly constant.
- CSS classes: `kebab-case`.

Types:

- This is a JavaScript project; avoid TypeScript unless requested.
- JSDoc is not required; add only if logic is non-obvious.

Formatting:

- Favor short helper functions inside a component for clarity.
- Avoid deeply nested ternaries; use early returns or helpers.
- Prefer `const` for bindings; use `let` only when reassigned.

React patterns:

- Use hooks at top level; no conditional hooks.
- Keep state initialization predictable; use lazy init where it reads storage.
- Prefer `useCallback` for functions passed deep into props.
- For derived data, compute locally instead of storing in state.

Error handling:

- LocalStorage, clipboard, and decoding use `try/catch` with safe fallbacks.
- Avoid throwing inside UI; return a fallback UI or no-op.
- Use `console.error` for non-fatal errors (see `scrape.mjs`).

Side effects:

- Use `useEffect` for localStorage syncing and other side effects.
- Clean up timers or async callbacks if added.

Data conventions:

- `content.json` is structured as units with `pages` and `unitPdfUrl`.
- Exercise paths (e.g., `unit01/exc01/ex1.htm`) are used as stable IDs.
- `exercises.json` uses a `defaultDescription` and per-path overrides.

## CSS / UI Style

Global styles live in `src/index.css`:

- Use CSS variables declared in `:root` for color and sizing.
- Prefer existing tokens (e.g., `--color-primary`, `--border-radius-md`).
- Keep class naming consistent with current patterns.
- Animations are defined via keyframes; reuse when possible.
- Avoid inline styles unless a value is truly dynamic (data-driven).

When adding new UI:

- Match the glassmorphism look (semi-transparent surfaces, soft shadows).
- Use the existing button styles or extend them carefully.
- Ensure responsive behavior at `1024px` and `640px` breakpoints.

## Linting Notes

- ESLint uses flat config in `eslint.config.js`.
- `no-unused-vars` ignores variables matching `^[A-Z_]`.
- React hooks linting is enabled; follow hook rules.

## Operational Safety

- Do not edit `node_modules`.
- Keep `content.json` in sync with `scrape.mjs` output if regenerated.
- Avoid adding new dependencies unless necessary.

## Example Workflows

Run lint before opening a PR:

```bash
npm run lint
```

Regenerate content data:

```bash
node scrape.mjs
```

Then verify the app:

```bash
npm run dev
```
