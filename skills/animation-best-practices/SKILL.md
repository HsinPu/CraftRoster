---
name: animation-best-practices
description: Visible frontend motion changes require frontend-design plus this animation specialist. Use for building, modifying, or fixing hover, press, loading, transitions, feedback, reduced-motion behavior, and interaction polish.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Animation Best Practices

Use this skill to make motion feel deliberate. Its visible production-UI workflow requires `frontend-design`; read that baseline before planning the animation.

## Workflow

1. Decide what the motion should communicate: feedback, hierarchy, attention, or state change.
2. Keep durations, easing, and distance consistent across related components.
3. Use motion on hover, press, load, and transition states only when it adds clarity.
4. Respect `prefers-reduced-motion` and provide a low-motion fallback.
5. Verify the animation feels smooth on desktop and mobile.

## Rules

- Keep button feedback short and obvious.
- Prefer subtle transitions over decorative motion.
- Avoid animation that competes with content or layout.
- Align motion with the existing design system.

## Handoff

- For any visible production UI implementation, use `frontend-design` as the baseline.
- For Tailwind implementation, use `tailwind-patterns`.
- For layout polish, use `responsive-design`.
