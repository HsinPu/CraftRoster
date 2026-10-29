# iOS: SwiftUI and UIKit

Use for an existing native iOS interface. Check the app target, deployment target, Xcode/Swift versions, navigation owner and actual view framework before choosing a repair. An iOS SwiftUI recipe does not establish macOS behavior; a mobile browser preview does not establish native behavior. Flutter and React Native use their own framework reference together with the relevant iOS acceptance checks.

## Locate the defect and its owner

Inspect the affected SwiftUI view and state model, or UIKit controller, storyboard/XIB and constraints. Read the product's design guidance and existing assets, type styles, colors and spacing. Reproduce the requested journey with the same data, text, keyboard and presentation state. Use critique/audit to report evidence without source changes; for authorized polish, patch the actual view, constraints, resources or state owner and inspect the resulting diff.

Do not replace UIKit with SwiftUI, change the navigation architecture, raise the deployment target, modify signing or install a test framework merely to polish a screen. Gate APIs against the existing target; retain a supported older implementation when needed. `swiftui-development`, `ios-architecture`, `swift-concurrency` and `mobile-app-testing` are conditional companions when available. These recipes remain usable without them; disclose any specialized work that cannot be completed independently.

## Typography and layout repairs

**SwiftUI:** trace clipping through the row and its ancestors. Replace a fixed text/container height with content-driven sizing; retain minimum control dimensions where appropriate. Use semantic text styles or the app's scaled custom font, wrapping and alignment. A multiline label may need `.fixedSize(horizontal: false, vertical: true)` after removing its height constraint. Check that the enclosing stack can grow or scroll. Do not apply that modifier indiscriminately to an entire form or make every label one line with shrinking text.

For long forms, keep the existing state bindings and use the project's `Form`, `List` or `ScrollView` structure. A persistent bottom action can use an appropriate `safeAreaInset` on supported OS versions; avoid an absolute overlay covering the final field. Check parent safe-area and keyboard handling before adding another inset. The system should still accommodate the keyboard. Do not globally ignore keyboard safe areas to hide the defect. [iOS conventions](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) and [safe-area APIs](https://developer.apple.com/documentation/swiftui/view/safeareainset(edge:alignment:spacing:content:)) inform these choices.

**UIKit:** edit the actual storyboard constraint or source constraint, rather than layering a second conflicting one. Let multiline labels grow; inspect compression resistance, hugging priorities and a complete vertical constraint chain. For a scaled branded font, adapt this fragment to the existing label and font resource:

```swift
if let base = UIFont(name: brandFontName, size: existingBodySize) {
    messageLabel.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: base)
} else {
    messageLabel.font = UIFont.preferredFont(forTextStyle: .body)
}
messageLabel.adjustsFontForContentSizeCategory = true
messageLabel.numberOfLines = 0
```

Keep the app's font choice; fix scaling rather than replacing its brand typography. The system-font fallback is already scaled, so do not scale it again. Remove fixed label/row heights and validate self-sizing cells. [Dynamic Type configuration](https://developer.apple.com/documentation/uikit/scaling-fonts-automatically) explains text styles and custom-font metrics.

## Keyboard, safe areas and navigation

**UIKit keyboard repair:** identify whether an existing container already adjusts scroll insets. On iOS 15+, an affected scroll container can track `view.keyboardLayoutGuide.topAnchor`; deactivate its old incompatible bottom constraint before activating the replacement. Keep top/leading/trailing constraints to the intended safe area. Within a `UIScrollView`, constrain content to its `contentLayoutGuide` and constrain the content width to `frameLayoutGuide` for vertical scrolling. Ensure the focused field and validation message can be scrolled into view. [keyboardLayoutGuide](https://developer.apple.com/documentation/uikit/uiview/keyboardlayoutguide) does not follow undocked keyboards by default: [followsUndockedKeyboard](https://developer.apple.com/documentation/uikit/uikeyboardlayoutguide/followsundockedkeyboard) defaults to `false`. If the affected iPad flow must track a floating keyboard, configure tracking intentionally and use appropriate near-edge/away-from-edge tracking constraints rather than blindly anchoring the whole form to its top. Floating keyboards and alternate layouts still need target-device checks.

For supported pre-iOS-15 targets, preserve the existing notification-based handler and correct its coordinate conversion, animation timing, observer lifecycle and overlap calculation. Avoid accumulating additional inset on each keyboard notification. Do not ship an unavailable API without a guarded fallback.

**Navigation and state:** repair the owner of the navigation path/presentation binding in SwiftUI, or navigation controller/presentation delegate in UIKit. Preserve interactive Back and cancel behavior. Do not add an independent Boolean for a sheet when an existing route already owns it. Keep unsaved edits and validation errors through keyboard dismissal and supported interruptions. For a failed submit, preserve field content, show a recoverable error and restore the correct enabled state; a spinner must not permit duplicate submissions. A disappearing view must not later present stale success UI from an obsolete request.

## Appearance, semantics and motion

Resolve unreadable text through the existing semantic color/resource layer. Test light/dark and increased contrast where supported; a color literal that matches one screenshot can fail in another appearance. Respect Reduce Motion when changing animation. System fonts and native controls remain valid design choices. [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility) supports user-controlled text, appearance and interaction settings.

Use a native `Button`, toggle or text field before reconstructing its behavior from gestures. For an icon-only action, give it an action-specific localized label. Expose selected/disabled/value state through native semantics, and keep decorative images out of the reading order. In SwiftUI, group a descriptive row only when doing so preserves its separate actions; in UIKit, inspect `isAccessibilityElement`, labels, values, traits and container order. Do not hide a parent containing actionable children or duplicate the visible label with an unnecessary spoken hint. Reuse localization resources, including RTL behavior. [VoiceOver implementation and auditing](https://developer.apple.com/documentation/uikit/supporting-voiceover-in-your-app) describes native element information and reading order.

## State and performance changes

Trace slow scrolling or a frozen action to measured work before replacing the layout. Keep stable row identity, reuse/self-sizing behavior and existing model ownership. Move expensive decoding or synchronous I/O off the UI path using the app's existing concurrency approach; publish view state on the required actor/thread and cancel obsolete work. Preserve loading, empty, error, offline and retry states. Test rapid repeated actions and return-from-background behavior relevant to the patch. Report the actual device, build mode, data size and measurement when claiming a performance improvement.

## Acceptance and evidence

Verify SwiftUI and UIKit separately; success in one framework does not pass the other. For the affected framework, record the code/build revision, Xcode version, scheme, deployment target, simulator/device OS, device size, text size, locale, appearance and journey state.

| Check | Observable result |
|---|---|
| Diagnostic mode | Source remains unchanged; findings identify the affected view/constraint/state and the reproduced or inferred evidence. |
| Authorized modification | A focused source diff fixes the stated defect while preserving content, data bindings, design resources and navigation ownership. |
| Text/layout | Default and a representative accessibility Dynamic Type size, long localized content and a small supported phone remain readable and operable; supported rotation/size changes preserve work. |
| Keyboard/navigation | Focus the final field, show/hide the keyboard, submit, correct an error, cancel/back and resume; no obscured action, trapped focus or lost edits. |
| Native accessibility | Inspect the native accessibility hierarchy, then complete the affected journey with VoiceOver; check labels, order, value/state and separate actions. |
| Appearance/state | Relevant light/dark, contrast/motion settings, loading/error/retry and repeated action states work on the target app. |

Use the project's existing XCTest/UI tests, target build and [XCUIAutomation](https://developer.apple.com/documentation/xcuiautomation) where appropriate; discover actual schemes and destinations before constructing commands. Capture the native app with matching state before/after. A source check, accessibility tree, screenshot or successful build proves only that layer; none alone proves VoiceOver navigation, keyboard behavior or performance. If Mac/Xcode, simulator or device access is missing, report exactly which checks could not run. Use an isolated test destination where possible; record and restore any changed device accessibility, text or appearance settings.

Primary documentation reviewed 2026-10-29. API behavior and availability must be rechecked against the project's actual SDK when applying a recipe.
