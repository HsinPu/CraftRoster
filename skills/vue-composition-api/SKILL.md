---
name: vue-composition-api
description: Vue 3 Composition API and SFC macro guide for script setup, defineProps, defineEmits, defineModel, composables, refs, computed values, watchers, lifecycle hooks, and reactivity performance. Use when writing or reviewing Vue 3 Single File Components, extracting composables, choosing ref versus reactive or shallowRef, or fixing Composition API misuse.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Vue Composition API

Use this skill for Vue 3 component logic and composables. Pair with `vue-development` for broader application structure, `vue-debug-guides` for runtime failures, and `nuxt-development` for Nuxt-specific conventions.

Read `typescript-development` before planning typed props, emits, composables, TypeScript SFCs, or compiler diagnostics. Read `frontend-design` before planning changes to visible UI or user-facing component states. Apply these conditions independently; JavaScript composable refactoring without visible behavior changes may use this Skill alone.

## Workflow

1. Identify the component, composable, props/emits contract, lifecycle needs, and reactivity shape.
2. Choose `ref`, `reactive`, `computed`, `watch`, or composable extraction based on ownership and side effects.
3. Keep props immutable and expose state intentionally through typed returns or component contracts.
4. Add cleanup for async effects, subscriptions, timers, and external library instances.
5. Verify with component behavior, TypeScript, and focused Vue tests when logic changes.

## Defaults

- Prefer `<script setup lang="ts">` for SFCs.
- Prefer Composition API over Options API for new code.
- Keep props immutable; derive local state explicitly when editable local copies are required.
- Use `computed` for derived values and `watch` only for side effects or async reactions.
- Use `shallowRef` for large objects, external library instances, DOM-ish objects, or data where deep reactivity is unnecessary.

## SFC Macros

- Type `defineProps` and `defineEmits` directly; avoid duplicating runtime and type declarations unless runtime validation is needed.
- Use `withDefaults` for optional prop defaults when not relying on framework-supported destructure defaults.
- Use `defineModel` for component `v-model` contracts; name the model when the component exposes multiple models.
- Use `defineExpose` only for deliberate public instance APIs, not as a shortcut around prop/event design.
- Use `defineSlots` when slot props matter for TypeScript users.

## Reactivity Choices

- Use `ref` for primitives and replaceable values.
- Use `reactive` for cohesive mutable objects that are not routinely destructured.
- Use `toRef` / `toRefs` when exposing properties from a reactive object without losing reactivity.
- Use `readonly` for state returned from composables when callers should not mutate internals.
- Avoid destructuring reactive objects unless converted to refs first.

## Watchers

- Prefer `watch(source, callback)` when the dependency is specific and the callback performs a side effect.
- Prefer `watchEffect` only when automatic dependency collection makes the code simpler and still obvious.
- Clean up async effects with watcher cleanup APIs or an abort signal.
- Set `flush: 'post'` only when the effect needs the updated DOM.
- Avoid deep watchers on large objects; watch a smaller source or normalize the state shape.

## Composables

- Name composables with `useX` and keep them framework-facing, not component-specific dumping grounds.
- Accept refs, getters, or plain values when useful; normalize with `toValue`.
- Return stable, typed state and functions; avoid returning giant mutable bags.
- Register lifecycle hooks inside composables only when they are meant to be called during component setup.
- Keep network, storage, timers, and subscriptions cancelable or disposable.

## Avoid

- Mutating props directly.
- Mirroring props into local refs without a synchronization rule.
- Using watchers for values that should be `computed`.
- Creating composables that depend on hidden global singletons unless that is the intended app boundary.
- Using deep reactive state for large immutable payloads.
