# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shopify embedded app template using React Router v7 (file-system routing), Prisma with SQLite for session storage, and Shopify App Bridge v4 with Polaris web components.

## Commands

```bash
npm run dev              # Start dev server via Shopify CLI (tunnel + HMR)
npm run build            # Production build (react-router build)
npm run start            # Serve production build
npm run typecheck        # Generate route types + tsc --noEmit
npm run lint             # ESLint with cache
npm run setup            # prisma generate && prisma migrate deploy
npm run graphql-codegen  # Generate GraphQL types from Admin API schema
npx prisma studio        # Visual database browser
```

Docker:
```bash
docker build -t app .
docker run -p 3000:3000 app   # runs setup + start
```

## Architecture

### Routing (flat file-system routes)

Routes are discovered automatically via `@react-router/fs-routes` (`flatRoutes()` in `app/routes.ts`). Naming convention:

- `app.tsx` — Authenticated layout (all `/app/*` routes nest here)
- `app._index.tsx` — Dashboard at `/app`
- `app.additional.tsx` — Second page at `/app/additional`
- `auth.$.tsx` — OAuth callback catch-all
- `auth.login/route.tsx` — Manual shop login form
- `webhooks.app.*.tsx` — Webhook handlers

### Auth Flow

`app/shopify.server.ts` configures the Shopify app with `@shopify/shopify-app-react-router`. Key exports:
- `authenticate` — call `authenticate.admin(request)` in every protected route loader/action
- `login` — used by the login page
- `sessionStorage` — Prisma-backed (SQLite)
- `addDocumentResponseHeaders` — injected in `entry.server.tsx` for CSP headers

### UI Layer

- Polaris web components (`s-page`, `s-button`, `s-section`, etc.) — typed via `@shopify/polaris-types`
- `AppProvider` from `@shopify/shopify-app-react-router/react` wraps all app routes
- `useAppBridge()` for toasts, navigation, etc.
- Navigation defined in `app.tsx` via `<s-app-nav>` element

### Database

- Prisma with SQLite (`prisma/schema.prisma`)
- Single `Session` model managed by `@shopify/shopify-app-session-storage-prisma`
- SQLite uses `prisma migrate deploy` for schema changes
- Database file: `prisma/dev.sqlite` (auto-created)

### Extensions

- `extensions/` directory (npm workspace) — currently empty
- `.graphqlrc.ts` auto-discovers per-extension GraphQL schemas
- Generate new: `npm run generate extension`

## Key Patterns

- **Embedded app navigation**: Use `Link` from `react-router` or Polaris, never `<a>`. Use `redirect` from `authenticate.admin`, not from `react-router`.
- **GraphQL**: Use `admin.graphql()` from the authenticated session. Types generated to `app/types/`.
- **Webhooks**: Declared in `shopify.app.toml`, not registered in code. Handlers are route files.
- **ESLint**: Allows `variant` prop on unknown elements (Polaris web components). `shopify` is a readonly global (App Bridge).

## Config Files

| File | Purpose |
|---|---|
| `shopify.app.toml` | App identity, scopes (`write_products`), webhooks, API version |
| `shopify.web.toml` | Dev/predev commands (prisma generate + migrate deploy + react-router dev) |
| `.graphqlrc.ts` | GraphQL codegen — Admin API, auto-discovers extension schemas |
| `vite.config.ts` | HMR on port 64999, optimizes app-bridge-react, port from `$PORT` or 3000 |
