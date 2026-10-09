---
name: prisma-drizzle
description: Prisma and Drizzle ORM guide covering schema modeling, migrations, relations, query patterns, transactions, raw SQL boundaries, type safety, generated clients, deployment, and production troubleshooting. Use when implementing or reviewing TypeScript database access with Prisma ORM or Drizzle ORM.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Prisma And Drizzle

Use this skill when a TypeScript or JavaScript project uses Prisma ORM or Drizzle ORM for database schema, migrations, queries, or type-safe data access.

Read `typescript-development` before planning changes to TypeScript schemas, database-access code, typed public APIs, or compiler diagnostics. Prisma schema or SQL-only work without TypeScript changes may use this Skill alone.

## Core Scope

- Prisma schema, Prisma Client, migrations, introspection, and deployment
- Drizzle schema, query builder, relations, Drizzle Kit, and generated migrations
- Type-safe query patterns, transactions, pagination, and raw SQL escape hatches
- Production migration safety, connection management, and serverless constraints
- Integration with Next.js, API services, Supabase, Neon, Postgres, MySQL, and SQLite

## Workflow

1. Identify the ORM, database provider, runtime, and migration strategy.
2. Model tables, relations, constraints, indexes, and nullability deliberately.
3. Generate migrations from schema changes and review generated SQL.
4. Keep migration files committed and separate from local-only database pushes.
5. Wrap multi-step writes in transactions.
6. Verify query performance and connection behavior in the target runtime.

## Prisma Guidance

- Treat `schema.prisma` and migration history as source-controlled artifacts.
- Use `prisma migrate dev` for development migrations and production-safe deploy commands in release workflows.
- Use `prisma db pull` and baselining carefully for existing databases.
- Avoid using `db push` as a replacement for reviewed production migrations.
- Use raw SQL only when ORM APIs cannot express the query safely or efficiently.

## Drizzle Guidance

- Treat TypeScript schema as the source for generated SQL migrations.
- Use Drizzle Kit generate/migrate flows rather than editing production schema by hand.
- Keep schema names, relation names, and SQL defaults explicit.
- Prefer SQL-like query clarity for complex joins and performance-sensitive paths.
- Review generated SQL for destructive operations before applying it.

## Production Checks

- Confirm connection pooling strategy for serverless and long-running servers.
- Add indexes for high-volume filters, joins, foreign keys, and ordering patterns.
- Use cursor/keyset pagination for large datasets.
- Avoid N+1 query patterns in API handlers and Server Components.
- Test migrations against realistic data volume when they alter large tables.

## Handoff

- Use `database-design` for target schema, relationships, constraints, indexes, and integrity modeling.
- Use `database-migration-workflow` to coordinate expand, backfill, validate, contract, rollout, and recovery across environments.
- Use `sql-best-practices` for raw SQL and query optimization.
- Use `nextjs-development` for Next.js runtime and server component integration.
- Use `supabase-development` when Supabase Postgres and RLS are part of the stack.

## References

- Prisma Migrate: `https://www.prisma.io/docs/orm/prisma-migrate/getting-started`
- Drizzle Migrations: `https://orm.drizzle.team/docs/migrations`
- Drizzle Overview: `https://orm.drizzle.team/docs/overview`
