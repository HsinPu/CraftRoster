---
name: lobe-icons-usage
description: Lobe Icons usage guide for selecting and integrating AI, LLM, model, provider, and application brand icons from the @lobehub/icons ecosystem. Use when building model selectors, provider lists, AI dashboards, settings pages, marketplace cards, or brand/icon systems that need consistent AI product logos in React, React Native, SVG, PNG, or WebP form.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Lobe Icons Usage

Use this skill when a UI, document, dashboard, or product surface needs recognizable AI, model, provider, or application brand icons from the Lobe Icons ecosystem.

Read `frontend-design` before integrating icons into visible production web UI. Asset selection, exported files, static documents, and native UI do not activate that web implementation baseline.

## Workflow

1. Identify the target surface: React UI, React Native app, static docs, exported asset, or design system.
2. Choose the package and asset format that matches the runtime and rendering constraints.
3. Select the icon variant, label pairing, size, theme behavior, and fallback behavior.
4. Check accessibility labels, contrast, dark-mode handling, and brand implication.
5. Provide the import or asset usage pattern only after confirming the package fits the surface.

## Use Cases

- Model provider lists and AI settings pages.
- Chat app model switchers and API key forms.
- AI marketplace cards, integration directories, and dashboard navigation.
- Static brand assets for docs, landing pages, and product UI.

## Packages

- `@lobehub/icons`: React icons.
- `@lobehub/icons-rn`: React Native icons.
- `@lobehub/icons-static-svg`: static SVG assets.
- `@lobehub/icons-static-png`: static PNG assets.
- `@lobehub/icons-static-webp`: static WebP assets.
- `@lobehub/icons-static-avatar`: avatar-style assets.

## Selection Rules

- Use SVG or React components for UI where color and scale must stay sharp.
- Use PNG/WebP for static previews, docs, or environments without SVG/component support.
- Pair icons with text labels when provider recognition affects user decisions.
- Check contrast in light and dark mode; many brand marks need alternate variants.
- Do not imply partnership or endorsement from an icon alone.

## Output

- Recommend the package and asset format for the target surface.
- Include implementation notes for sizing, accessibility labels, dark mode, and fallback icons.

## Handoff

- Use `lobe-ui-development` when the task is mostly about @lobehub/ui components, layout, or AIGC UI composition.
- Use `ui-styling` when the icons are only one part of a broader React/Tailwind visual polish task.
- Use `logo-design` when the user needs a new brand mark rather than an existing provider or product icon.
