---
name: react-ui-patterns
description: Visible React web UI changes require frontend-design plus this React state specialist. Use for building, modifying, fixing, or reviewing loading, error, empty, optimistic updates, Suspense, transitions, forms, mutations, and other user-visible component states; native consumers may reuse platform-neutral state guidance under their native owner.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# React UI Patterns

Use this skill when the work is about React UI state behavior, not visual styling.

## Frontend Baseline Gate

For any visible React web component or page creation, modification, redesign, polish, responsive change, or user-facing state repair, read `frontend-design` before planning. Keep this Skill focused on React state behavior. Native consumers may reuse platform-neutral loading, error, cancellation, and optimistic-update guidance; native views remain with `react-native-expo` and do not activate this web baseline unless an actual web target is being changed.

## TypeScript Baseline Gate

When the component, hook, or test uses `.ts`, `.tsx`, TypeScript generics, typed props, or typed public APIs, read `typescript-development` before planning. Keep this skill responsible for React state and user-visible behavior while `typescript-development` owns the type and module contracts.

## When To Use

- Build or review components that fetch data, submit mutations, or refresh in the background
- Design loading, error, empty, and retry states for lists, detail views, and forms
- Add optimistic updates, skeletons, or subtle refresh indicators
- Use `Suspense`, `useTransition`, or `useDeferredValue` to keep UI responsive

## Workflow

1. Identify the user-visible state machine: initial, loading, success, empty, error, retry, mutation, and refresh.
2. Keep existing content visible during background refresh whenever possible.
3. Place loading and error feedback near the control or content it affects.
4. Add optimistic updates only when rollback is clear and visible.
5. Verify states with component tests, story states, or browser interaction rather than only compile success.

## Core Principles

- Never replace visible data with a spinner unless there is no data to show.
- Surface every error to the user with a clear recovery path.
- Keep content visible during background refetches; show a subtle refreshing state instead.
- Use optimistic updates only when rollback is straightforward.
- Prefer progressive disclosure over blocking the whole screen.

## Loading States

- Use skeletons when the final layout is known.
- Use spinners for short, isolated actions like button submissions.
- For lists and detail pages, show loading only on the initial empty state.
- If cached or stale data exists, render it and annotate refresh status.
- If using React Query or SWR, prefer cached data plus `isFetching` or `isValidating` over a full-screen fallback.

```tsx
const { data, isLoading, isFetching, error, refetch } = useQuery(...);

if (error) return <ErrorState error={error} onRetry={refetch} />;
if (isLoading && !data) return <ListSkeleton />;
if (!data?.items.length) return <EmptyState />;

return (
  <>
    {isFetching ? <InlineRefreshIndicator /> : null}
    <ItemList items={data.items} />
  </>
);
```

## Error Handling

- Show inline field errors for forms.
- Use banners or page-level error states when partial data is still usable.
- Use full-screen error states only when the page cannot function.
- Never swallow errors in `catch`; surface them with a retry or recovery action.
- Pair `Suspense` boundaries with an error boundary and a retry affordance.

## Empty States

- Provide an explicit empty state for every collection.
- Keep empty states contextual: no results, no items yet, permission denied, or filtered away.
- Include the next action when the user can recover.

## Mutations

- Disable the triggering control during async work.
- Show loading on the control that initiated the action.
- Use optimistic updates when the user benefit outweighs rollback complexity.
- Always handle mutation failures and revert or explain the mismatch.

```tsx
<Button
  onClick={handleSave}
  disabled={isSaving}
  isLoading={isSaving}
>
  Save
</Button>
```

## Concurrency

- Use `useTransition` for non-urgent updates such as filters, tab changes, or route-adjacent UI.
- Use `useDeferredValue` for expensive derived views that should lag behind typing.
- Cancel stale requests when a later interaction makes them irrelevant.
- Keep local input state responsive even when the data view is expensive.

## Quality Gate

- Every async flow has success, loading, empty, and error states.
- Background refresh does not erase visible content.
- Buttons and submits are disabled while in flight.
- The user can recover from failures without reloading the page.

## Handoff

- For general code style and async primitives, use `javascript-development` or `typescript-development`.
- For visual treatment, spacing, motion, and polish, use `frontend-design`.
- For team-wide conventions, use `coding-standards`.
