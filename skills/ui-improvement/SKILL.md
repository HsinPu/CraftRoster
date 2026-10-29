---
name: ui-improvement
description: "Inspect and improve an existing web, Windows, macOS, iOS, or Android interface through design critique, technical audit, or scoped source fixes. Use for visible UI quality, layout, themes, accessibility, navigation, and interaction-state improvements; backend-only work and translation without an affected UI contract do not activate this Skill."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "pbakaus/impeccable"
  reference-license: "Apache-2.0"
  reference-revision: "5e745ace7e151feb2a93d360d0281fe39448b857"
---

# UI Improvement

Improve the existing user journey in its actual framework. This package works independently; companions add specialized workflows only when installed and relevant. Its rules do not grant tools, write access, or permission to redesign.

## Select the work

Read the user's request, repository instructions, existing `DESIGN.md`, target source, and nearby shared components. Identify the product target OS, UI framework and version, minimum OS/target SDK, affected screen/state, and available execution host separately. A Windows host does not make a Swift project a Windows app; a small browser viewport is still web.

| Mode | Work and deliverable |
|---|---|
| Critique | Explain task friction, hierarchy, density, comprehension, and visual coherence; give prioritized, evidence-backed findings. Do not edit product source. |
| Audit | Inspect concrete layout, input, accessibility, themes, state, lifecycle, and measured performance defects. State reproduction, impact, evidence and smallest repair. Do not edit product source. |
| Polish / fix | Make the authorized source changes, preserve incumbent design and behavior, then verify the affected path. A clear request to improve or repair is sufficient authorization for bounded edits. |

For a combined review-and-fix request, diagnose then implement in one flow. For review-only work, report the repairs without performing them. A read-only Agent stays read-only in every mode, including report persistence; return findings in chat or hand off to an authorized writer. Installing this Skill through a testing bundle does not disable its implementation modes or elevate the caller's permissions.

Use [workflow and evidence](references/workflow-and-evidence.md) for the shared correction loop and reporting contract. Load only the applicable platform sections:

| Affected implementation | Read | Conditional companion |
|---|---|---|
| Browser UI, mobile web, desktop renderer/WebView | [Web](references/web.md) | `frontend-design-review` for review; `frontend-design` for edits |
| Windows WinUI or WPF | [Windows](references/windows.md) | No required framework package |
| macOS AppKit or SwiftUI | [macOS](references/macos.md) | Do not substitute the iOS-only SwiftUI Skill |
| iOS UIKit or SwiftUI | [iOS](references/ios.md) | `swiftui-development` for iOS SwiftUI only |
| Android Compose or Views/XML | [Android](references/android.md) | Built-in native repair guidance; Flutter/RN are different stacks |
| Flutter or React Native on iOS/Android | [Cross-platform frameworks](references/cross-platform-frameworks.md) plus affected OS references | `flutter-development` or `react-native-expo` |
| Electron or Tauri on Windows/macOS | [Cross-platform frameworks](references/cross-platform-frameworks.md), web rules, and affected OS interaction sections | `desktop-development` for Electron shell only |

`accessibility-testing` can support a requested independent accessibility audit, `mobile-app-testing` a device/lifecycle matrix, and `visual-regression-testing` its web screenshot workflow. None is an installation prerequisite. Check companion availability before use; otherwise use the bundled rules and project evidence for feasible work, and name any task-specific capability that remains missing. Do not silently install companions or claim to have read one that is absent.

## Preserve the product contract

- Keep the established brand, content facts, framework, deployment targets, state owners, keyboard/Back behavior and accessibility settings. Repair at the narrowest correct shared component or screen. Refinement does not authorize replacing the visual identity.
- Missing `DESIGN.md` does not erase the incumbent design. Derive only verified conventions from the current UI; write/update it when the requested implementation and repository rules call for it. Diagnosis can report observations without writing files.
- UI localization affects length, wrapping, direction and accessible names; treat these as interface contracts. Pure text translation outside a UI is not an interface task.
- Choose APIs and native controls for the actual stack/version. Do not apply DOM rules to AppKit, UIKit, WPF or Compose, and do not route all Swift to iOS.
- No engine, detector, hooks, SDK, framework migration, device settings, signing or release operations are prerequisites to using this Skill. Do not add them as incidental polish work.

For other UI frameworks, inspect the project's existing APIs and tests and state the narrower supported scope. WinForms, Qt/PySide, Avalonia, MAUI, Flutter desktop and React Native Windows/macOS do not inherit the specific repair recipes or acceptance evidence of the listed branches.

Finish with the actual diff for implementation, relevant before/after behavior and checks, and remaining gaps. Source inspection, successful compilation, screenshots, interactive testing, assistive-technology testing and performance measurement prove different things. A missing target runtime permits useful source work, but never a native runtime pass.

See [source attribution and adaptation boundaries](references/upstream-notice.md).
