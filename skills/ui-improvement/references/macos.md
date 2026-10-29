# macOS native interface improvement

Use for **AppKit** and **macOS SwiftUI**. The existing `swiftui-development` Skill targets iOS; its presence does not establish AppKit or macOS support. Main Agent or an authorized native implementation owner can perform the repairs here. For Electron/Tauri, combine OS interaction expectations with [cross-platform-frameworks.md](cross-platform-frameworks.md). Read [workflow-and-evidence.md](workflow-and-evidence.md) for modes and evidence.

## Establish the target

Inspect the actual macOS app target, deployment version, Xcode/Swift version, AppKit/SwiftUI ownership, entitlements, scenes/windows, document model, menus, resources and current test scheme. A `.swift` extension does not identify iOS, and the computer running the coding Agent does not identify the product target. Preserve deployment fallbacks and existing state/brand decisions; polish does not authorize a new architecture, SDK upgrade, signing change or submission.

Identify which actions belong to a window/document, which are app-wide, and which use the focused control. Preserve multiple windows and expected active/inactive behavior. Keyboard and pointing input are important baselines; apply other inputs according to the actual product and device capabilities, rather than assuming all Macs have identical input hardware.

## Rules and source repairs

| Observed defect | AppKit repair location | macOS SwiftUI repair location | Check after the patch |
|---|---|---|---|
| Narrow windows clip labels or hide controls | View/controller XIB/storyboard or programmatic constraints; correct conflicting fixed sizes and compression/hugging priorities; allow long labels to wrap. Check scroll ownership and meaningful window minimums. | Existing scene and view layout: remove unnecessary fixed frames, use appropriate flexible sizing/wrapping, and preserve sidebar/detail selection. Gate newer layout APIs. | Minimum supported window size, long/localized content, multiple/reopened windows, fullscreen and active/inactive states. |
| Menu or shortcut affects the wrong document | Existing `NSMenuItem` target/action and responder chain; validate enablement against the active owner using its existing validation path. | Scene `.commands`, focused values/bindings and disabled state; keep commands bound to the active window's model. | With two windows, keyboard/menu action changes only its intended target; no selection/pending state disables the action correctly. |
| Save/cancel or modal close loses focus/data | Window/controller presentation and first-responder restoration; use standard file/document interaction where already present. | Presentation, focus and scene state at their current owner; preserve cancellation and unsaved-data behavior. | Edit, open/close dialog, cancel, save, switch windows, reopen. Confirm data and focus destination. |
| Theme or accessible interaction breaks | Existing semantic `NSColor`/named asset variants and native controls; adjust modern method-based accessibility properties where necessary. | Existing semantic colors/assets, native `Button`/`Toggle`/fields, accessibility labels/values and relevant environment preferences. | Supported appearances, contrast/reduced-motion settings, keyboard navigation and a real VoiceOver task. |
| Async result replaces newer selection or UI stalls | View/controller model and task lifetime; stop obsolete work and marshal UI changes correctly. Measure expensive work before changing it. | Preserve model/view identity and structured task ownership; cancel obsolete work and maintain main-actor correctness. | Same data/interaction before and after, rapid selection changes, window closure and loading/error/retry. Provide measurements for performance claims. |

Do not turn desktop preferences into an oversized phone screen by default. Preserve useful information density, standard menu/toolbar behavior and the product's established navigation. Treat a new rebrand, window model or document migration as a separate scope decision.

### Small patch example: a truncated AppKit label

At the affected `NSTextField`, inspect `usesSingleLineMode`, `lineBreakMode` and `maximumNumberOfLines`; enable wrapping with an appropriate line count when the content genuinely needs multiple lines. Remove the conflicting fixed-height constraint and ensure the containing layout can grow or scroll. Adjust compression resistance only to resolve the observed allocation problem; lowering every priority conceals constraint mistakes. Preserve the label's binding, font/resource and the neighboring editable control's accessibility relationship. Re-run the narrow-window and long-string case.

### Small patch example: an active-window command

For an AppKit command intended for the active document, inspect whether a fixed global target bypasses its responder-chain owner. Repair that target/action wiring and enablement in the existing owner; do not move document state to a singleton. For SwiftUI, use the project's scene/focused state for the same command instead of capturing the first window's model in app-global commands. Test two windows with different selections and a focused text editor, including ordinary edit shortcuts.

### Accessible control repair

First inspect what a standard control already exposes. Add a meaningful accessible label/value or missing action only where it is absent or wrong. AppKit's current method-based `NSAccessibilityProtocol` is distinct from the legacy informal `NSAccessibility` page. Use native role-specific support for custom controls and notify meaningful changes where required; avoid replacing correct native semantics with a decorative container. SwiftUI accessibility modifiers and an accessibility identifier have different purposes. Verify the spoken result and operability, including dynamic state changes.

## Native verification and reporting

Treat `macos-appkit` and `macos-swiftui` as separate acceptance cells. Each needs a diagnostic case, an authorized source repair and the affected resizing/theme/accessibility outcomes. Build the existing target and run its focused tests on a Mac with compatible Xcode. Use its actual scheme/destination; don't invent a project name or upgrade Xcode just to claim a pass.

Exercise the native app's affected workflow: keyboard/menu commands, focus, data retention, supported resize/fullscreen and multiple-window behavior. Capture the revision, macOS/toolchain, window and app state. XCTest/XCUIAutomation and Accessibility Inspector can support interaction/semantics checks; distinguish toolchain availability from a new-framework requirement. An inspector tree or screenshot does not establish that VoiceOver completed the task. Measure a claimed latency/scrolling improvement with the same hardware/data and an appropriate profiler such as Instruments.

Prefer an isolated test account/device. Record and restore changed appearance/accessibility preferences. On a host without macOS/Xcode/runtime access, source repairs and available static checks can proceed, while macOS build, native interaction, VoiceOver and performance checks remain explicitly unexecuted. A browser rendering or iOS simulator does not verify a macOS window.

## Primary references

Reviewed 2026-10-29; API choices remain subject to the app's deployment/toolchain versions. Apple pages expose a Markdown view at the same path plus `.md` when the HTML requires JavaScript.

- [Apple: designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)
- [Apple: SwiftUI scenes and command ownership](https://developer.apple.com/documentation/swiftui/scenes)
- [Apple: user-interface command validation](https://developer.apple.com/documentation/appkit/nsuserinterfacevalidations)
- [Apple: method-based accessibility support](https://developer.apple.com/documentation/appkit/nsaccessibilityprotocol)
- [Apple: accessibility design](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple: XCUIAutomation](https://developer.apple.com/documentation/xcuiautomation)
