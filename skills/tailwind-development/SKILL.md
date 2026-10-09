---
name: tailwind-development
description: Visible Tailwind UI changes require frontend-design plus this Tailwind specialist. Use for building, modifying, fixing, reviewing, or refactoring utilities, theme variables, class composition, layers, directives, dark mode, Preflight, and generated output.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Tailwind CSS 開發（Tailwind Development）

## Frontend Baseline Gate

When Tailwind work creates or changes a visible page, component, layout, form, navigation, responsive state, theme, or visual treatment, read frontend-design before planning. Keep this Skill responsible for Tailwind mechanics and generated CSS. Build-only configuration or generated-CSS diagnostics without a visible UI change may use this Skill alone.

**在使用 Tailwind CSS（以 v4+ 為主）撰寫 UI 時請讀取本 skill。**

本 skill 以 Tailwind CSS 官方文件（v4 系列）為主要依據，整理偏實務的最佳做法：utility-first 的組件化策略、`@theme` 設計 tokens、如何處理 class 重複與衝突、何時寫自訂 CSS（`@layer` / `@utility` / `@apply`）、dark mode、Preflight，以及 class 掃描與輸出 CSS 體積控制。

## 適用範圍（Assumptions）

- Tailwind CSS v4+（文件以 v4.2 為基準）
- 有 build step（Vite / PostCSS / CLI），不是純 CDN demo

## When To Use

Use this skill when the task is about Tailwind CSS itself: configuration, theme tokens, class composition, generated CSS, dark mode, Preflight, or custom utilities.

- Build or refactor Tailwind-based UI while preserving utility-first architecture.
- Diagnose missing classes, dynamic class detection, CSS output size, Preflight conflicts, or dark-mode behavior.
- Decide when to use theme variables, component extraction, `@apply`, custom CSS, or Tailwind variants.

## Workflow

1. Identify the Tailwind version, build setup, stylesheet entry point, theme tokens, and source scanning behavior.
2. Map the affected UI to reusable tokens, utilities, variants, and component boundaries.
3. Avoid dynamic class names that Tailwind cannot detect; use explicit class strings or safelists when needed.
4. Keep custom CSS small and purposeful; prefer utilities unless a real abstraction or third-party integration requires CSS.
5. Verify the rendered UI, generated CSS, responsive states, dark mode, and build output when relevant.

## Handoff

- Use `tailwind-patterns` for ready-to-apply layout/component composition patterns in Tailwind.
- Use `ui-styling` when the task is broader React/shadcn/Radix visual polish.
- Use `frontend-design` as the baseline for visible production UI. Use `taste-skill` or `design-consultation` only when direction itself is the requested deliverable or blocks implementation, and `color-font-skill` when palette or typography is the main decision.
- Use `css-development` when the project is not primarily Tailwind or needs cascade/layout architecture outside Tailwind.

## 進階與參考（Bundled resources）

- **Architecture / 組件化**：utility-first 的重用策略、何時抽 component/partial、避免 conflicting utilities，見 [reference/architecture.md](reference/architecture.md)。
- **Design Tokens / Theme Variables**：用 `@theme` 建立與管理設計系統（colors/spacing/type/breakpoints），見 [reference/theme-tokens.md](reference/theme-tokens.md)。
- **Custom CSS / Directives**：`@layer`、`@apply`、`@utility`、`@custom-variant`、`@reference`（SFC/CSS modules），見 [reference/custom-css.md](reference/custom-css.md)。
- **Dark Mode**：`dark:` 變體與手動切換（class/data attribute），見 [reference/dark-mode.md](reference/dark-mode.md)。
- **Preflight**：base reset 的影響、第三方套件整合、如何擴充/停用，見 [reference/preflight.md](reference/preflight.md)。
- **Build / Class Detection**：避免動態拼 class、source 掃描、safelist 與忽略路徑，見 [reference/class-detection.md](reference/class-detection.md)。

---

## 外部參考（官方）

- Tailwind Installation：`https://tailwindcss.com/docs/installation`
- Styling with utility classes：`https://tailwindcss.com/docs/styling-with-utility-classes`
- Theme variables：`https://tailwindcss.com/docs/theme`
- Adding custom styles：`https://tailwindcss.com/docs/adding-custom-styles`
- Functions and directives：`https://tailwindcss.com/docs/functions-and-directives`
- Detecting classes in source files：`https://tailwindcss.com/docs/detecting-classes-in-source-files`
- Dark mode：`https://tailwindcss.com/docs/dark-mode`
- Preflight：`https://tailwindcss.com/docs/preflight`
