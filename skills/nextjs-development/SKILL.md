---
name: nextjs-development
description: Visible Next.js page or client UI changes require frontend-design plus this Next.js specialist. Use for building, modifying, fixing, reviewing, or refactoring App Router, Server and Client Components, data fetching, caching, actions, handlers, metadata, performance, security, and deployment.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Next.js Development

Use this skill when working on a Next.js app, especially App Router projects with React Server Components, server actions, route handlers, caching, and deployment concerns.

## Frontend Baseline Gate

When a Next.js task creates or changes a visible page, layout, component, form, navigation, responsive surface, interaction state, or visual treatment, read frontend-design before planning. Keep server-only route handlers, caching, metadata, and deployment work within this Skill unless they also change visible UI.

## TypeScript Baseline Gate

When the Next.js target uses `.ts`, `.tsx`, typed route parameters, typed Server Actions, Route Handlers, or TypeScript diagnostics, read `typescript-development` before planning. Keep this skill responsible for Next.js runtime boundaries and caching while `typescript-development` owns the type, module, and public API contracts.

## Core Scope

- App Router structure, layouts, pages, loading, error, and not-found boundaries
- Server Components and Client Components
- Data fetching, caching, revalidation, and dynamic rendering
- Server Actions and Route Handlers
- Metadata, SEO, images, fonts, and production optimization
- Authentication, authorization boundaries, environment variables, and deployment checks

## Workflow

1. Identify whether the project uses App Router, Pages Router, or both.
2. Map each feature to the right boundary: server component, client component, server action, route handler, middleware, or API route.
3. Decide caching behavior explicitly before adding data fetching.
4. Keep secrets, service-role keys, and privileged database calls server-only.
5. Validate forms and mutations at the server boundary.
6. Run focused checks: typecheck, build, lint, route smoke tests, and production rendering checks.

## App Router Boundaries

- Prefer Server Components for data loading and static UI.
- Use Client Components only for browser state, event handlers, effects, and client-only APIs.
- Keep `use client` as low in the component tree as possible.
- Use Route Handlers for public HTTP APIs, webhooks, and integrations.
- Use Server Actions for trusted app mutations, not general-purpose public APIs.

## Data And Caching

- Treat Next.js caching as a design decision, not a default to ignore.
- Use explicit `cache`, `next.revalidate`, `revalidatePath`, or `revalidateTag` when data freshness matters.
- Avoid mixing user-specific data with shared static caches.
- Verify dynamic routes and auth-sensitive pages do not leak cached user state.
- Document why a page is static, dynamic, ISR, or no-store.

## Security Checks

- Never expose server-only environment variables to client bundles.
- Validate all Server Action and Route Handler inputs.
- Check auth and resource ownership on the server, even when the UI hides actions.
- Keep webhook handlers idempotent and verify signatures.
- Avoid logging tokens, cookies, session data, and personal data.

## Production Checklist

- Run `next build` or the project equivalent before shipping.
- Check metadata, robots, sitemap, canonical URLs, and Open Graph where relevant.
- Inspect bundle size and client component boundaries for accidental bloat.
- Confirm image domains, redirects, headers, and rewrites.
- Validate runtime assumptions: Node.js, Edge, serverless limits, file system access, and environment variables.

## Handoff

- Use `react-ui-patterns` for component state and rendering patterns.
- Use `typescript-development` for type-level implementation details.
- Use `auth-integration` for application authentication flows.
- Use `stripe-payments` for checkout, billing, and webhook flows.
- Use `vercel-deployment` when the release target is Vercel.

## References

- Next.js App Router: `https://nextjs.org/docs/app`
- Next.js Caching: `https://nextjs.org/docs/app/deep-dive/caching`
- Next.js Production Checklist: `https://nextjs.org/docs/app/guides/production-checklist`
