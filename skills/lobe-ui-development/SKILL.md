---
name: lobe-ui-development
description: Lobe UI development guide for using @lobehub/ui in React, Next.js, and AIGC web app interfaces. Use when integrating Lobe UI components, ThemeProvider, I18nProvider, ConfigProvider motion setup, Ant Design compatibility, antd-style theming, or building AI product interfaces with the LobeHub UI ecosystem.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Lobe UI Development

Use this skill when the task is to integrate or customize `@lobehub/ui` components in a React or Next.js AIGC application.

Read `frontend-design` before planning integration that changes visible production UI. Package, provider, bundler, or SSR compatibility analysis without a visible UI change may use this Skill alone.

## Workflow

1. Confirm the host app uses compatible React, Ant Design, bundler, and SSR/client rendering assumptions.
2. Identify the component, provider, theme, i18n, and motion needs before adding imports.
3. Add the smallest integration surface: provider setup, component usage, theme tokens, or localized texts.
4. Preserve the host product's existing design system unless the task explicitly adopts Lobe UI.
5. Verify rendering, theme, dark mode, i18n, SSR, and bundle/build behavior in the target app.

## Core Notes

- `@lobehub/ui` is an ESM-only React UI component library for AIGC web apps.
- Components are based on Ant Design and are intended to work with `antd-style` for CSS-in-JS theming.
- In Next.js page-router SSR setups, add `transpilePackages: ['@lobehub/ui']` to `next.config.js`.

## Integration Pattern

```tsx
import { ThemeProvider, Button } from '@lobehub/ui';

export default function App() {
  return (
    <ThemeProvider>
      <Button>Hello AIGC</Button>
    </ThemeProvider>
  );
}
```

## I18n

- Use `I18nProvider` with resource bundles when components need localized text.
- Component `texts` props should override provider resources when both exist.

## Motion

- Pass a motion implementation through `ConfigProvider` when components require motion.
- If using `LazyMotion`, pass the `motion/react-m` export instead of the regular `motion` object.

## Checks

- Confirm React, Ant Design, and bundler compatibility before adding components.
- Preserve the host product's existing design system unless the task explicitly adopts Lobe UI.
- Verify theme, dark mode, i18n, and SSR behavior in the target app.

## Handoff

- Use `lobe-icons-usage` when the task is only selecting or rendering AI/model/provider icons.
- Use `ui-styling` for broader shadcn/Radix/Tailwind styling and visual polish.
- Use `nextjs-development` when the blocker is Next.js routing, SSR, build config, or server/client boundaries.
