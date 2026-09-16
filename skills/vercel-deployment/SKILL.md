---
name: vercel-deployment
description: Vercel deployment workflow covering projects, builds, environment variables, preview and production deployments, domains, redirects, functions, edge runtime, Next.js behavior, rollback, observability, and release checks. Use when deploying, debugging, or reviewing apps on Vercel.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Vercel Deployment

Use this skill when deploying or debugging a web app on Vercel, especially Next.js, React, frontend frameworks, serverless functions, and preview deployments.

## Core Scope

- Vercel projects, teams, Git integrations, preview deployments, and production deployments
- Build commands, output directories, framework auto-detection, and build cache
- Environment variables, system environment variables, and local env pull
- Serverless functions, Edge Functions, Middleware, and runtime constraints
- Domains, redirects, rewrites, headers, rollback, logs, and production checks

## Workflow

1. Identify whether the request is local preparation, read-only diagnosis or review, or deployment execution; record the authorized project, artifact, preview or production target, and effects. Carry forward valid existing authorization.
2. Identify the framework, build command, output directory, and package manager.
3. Check environment-variable names and scope for development, preview, and production without disclosing secret values.
4. Check existing logs and evidence first. Reproduce locally with the project build or Vercel CLI only when local writes and execution are within scope; otherwise report the needed check.
5. Verify runtime assumptions: Node.js version, Edge compatibility, file system access, and secrets.
6. Use available authorized preview evidence before production promotion. Creating a preview, merging, changing settings, or promoting production is a separate external effect that must fit the established authorization; a review request does not authorize it.
7. End preparation or review with a readiness report. After an authorized release, confirm domain, redirects, headers, analytics, and the recovery path.

## Environment Rules

- Keep secrets in Vercel environment variables, not source code.
- Separate preview and production credentials.
- Use `NEXT_PUBLIC_` only for values that are safe to expose in the browser.
- Pull local env only when needed and within authorized credential and local-write scope, into ignored files such as `.env.local`. A read-only review does not authorize exporting secrets.
- Watch Edge runtime environment limits when using Middleware or Edge Functions.

## Deployment Checks

- Confirm `next build` or framework build passes locally.
- Check serverless function logs for runtime-only failures.
- Validate routes that depend on dynamic rendering, caching, ISR, or server actions.
- Confirm webhooks and callback URLs point at the correct deployment.
- Prefer the established recovery plan for production regressions; execute rollback only within its authorized target and effects.

## Handoff

- Use `nextjs-development` for Next.js App Router, caching, and server boundary behavior.
- Use `deployment-operations` for release verification and rollback strategy.
- Use `github-actions-ci` when deployment is driven from CI workflows.
- Use `observability-engineering` for production logs, metrics, and alerts.

## References

- Vercel Builds: `https://vercel.com/docs/builds`
- Vercel Environment Variables: `https://vercel.com/docs/projects/environment-variables`
- Vercel System Environment Variables: `https://vercel.com/docs/environment-variables/system-environment-variables`
