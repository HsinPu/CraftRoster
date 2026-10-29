# Android: Compose and Views/XML

Use for an existing native Android interface. Inspect `minSdk`, `targetSdk`, compile SDK, Android Gradle Plugin, Kotlin, AndroidX Activity/Navigation and Compose/Material versions, plus the actual Activity/Fragment and UI framework. OS version, target SDK and library version jointly affect behavior. Keep those values unless an upgrade is part of the request; polishing is not permission for a dependency or architecture migration. Flutter and React Native require their framework rules plus applicable Android checks.

For critique/audit, report the defect and its evidence without edits. For authorized polish, change the actual Kotlin/Java composable, XML resource, controller or state owner. Preserve product resources, branding, localization and existing state architecture. Conditional `mobile-app-testing` or `accessibility-testing` can extend verification when installed; the native repair guidance here works without those companions.

## Insets, keyboard and adaptive layout

Find which component owns system-bar, cutout and IME insets before changing padding. An Activity, `Scaffold`, custom listener and nested content can otherwise compensate for the same area twice. Android 15+ enforces edge-to-edge when targeting SDK 35+, so a screen that worked with an older target can expose an overlap. Check the actual OS/target combination and later platform behavior rather than inserting a fixed status/navigation-bar height. See [insets](https://developer.android.com/develop/ui/compose/system/insets) and [Views edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

**Compose repair:** inspect `Scaffold`'s `contentWindowInsets`, the supplied inner padding and descendant inset modifiers. An existing form's scroll content can apply and consume that padding, then account for remaining IME space:

```kotlin
Scaffold(/* existing bars and configuration */) { innerPadding ->
    LazyColumn(
        modifier = Modifier
            .padding(innerPadding)
            .consumeWindowInsets(innerPadding)
            .imePadding()
    ) {
        // Existing fields, state bindings and stable item keys.
    }
}
```

Adapt the fragment to the actual container and imports. If an ancestor already handles/consumes IME insets, use that ownership instead of adding another handler. Preserve existing content spacing separately from system space. Verify the focused last field and final action can scroll into view; a `Box` overlay may need layout/inset changes, not another spacer. [Inset consumption](https://developer.android.com/develop/ui/compose/system/insets-ui) matters for nested modifiers.

**Views repair:** inspect XML `fitsSystemWindows`, Material containers and existing listeners. For a root whose owned padding should protect its children from bars/cutouts and the IME, use a single listener and a baseline captured before insets are applied:

```kotlin
val baselineLeft = root.paddingLeft
val baselineTop = root.paddingTop
val baselineRight = root.paddingRight
val baselineBottom = root.paddingBottom
ViewCompat.setOnApplyWindowInsetsListener(root) { view, windowInsets ->
    val overlap = windowInsets.getInsets(
        WindowInsetsCompat.Type.systemBars() or
            WindowInsetsCompat.Type.displayCutout() or
            WindowInsetsCompat.Type.ime()
    )
    view.setPadding(
        baselineLeft + overlap.left, baselineTop + overlap.top,
        baselineRight + overlap.right, baselineBottom + overlap.bottom
    )
    windowInsets
}
```

This is one ownership choice, not a listener to add to every view. Request insets when the view is attached if needed; retain the project's compatible IME/window setup. The combined type mask accounts for overlapping regions without summing keyboard and navigation heights. Returning insets keeps dispatch available; ensure descendants do not add the same padding again. Apply side-specific spacing to the appropriate bar, scrolling area or action container if root padding would incorrectly shrink edge-to-edge decoration. Preserve the initial padding across repeated dispatch; never add new inset values to the already adjusted padding.

Use the current **app window** dimensions and existing adaptive APIs to choose navigation and list/detail structure. Keep selection when moving between panes; do not infer available width only from a device being a tablet or a phone. Restrict foldable/multiwindow support claims to tested product targets. [Adaptive layout guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/get-started-with-adaptive-apps) covers window changes.

## Text, resources and semantics

**Compose:** replace a rigid text/row height with content-driven layout and an appropriate minimum touch target. Preserve the existing `MaterialTheme.typography` style or scaled product typography. Remove an accidental `maxLines = 1`/ellipsis constraint only where the content needs full display; check parent constraints and scrolling too. Do not override `LocalDensity` or font scale to force one screenshot. Use theme color roles and existing localized strings; fix dark-theme resource mapping instead of hardcoding a light palette.

**Views/XML:** patch `android:layout_height` from a clipping fixed height to `wrap_content` where the parent permits it, retain an appropriate `android:minHeight`, and remove incompatible single-line/max-line constraints. Keep the existing text appearance and use `sp` for text-size dimensions. In ConstraintLayout, check constrained width and the complete vertical chain; a label cannot wrap if its width is unbounded, and a wrapping label cannot grow inside a fixed-height parent. Preserve font resources rather than replacing brand typography. [Font resources](https://developer.android.com/develop/ui/views/text-and-emoji/fonts-in-xml) belong in the existing resource system.

For a tappable Compose control, prefer the native Material/control primitive. For an icon-only action, give the icon a localized action description; decorative icons use no description. Supply native role/state and selection semantics for custom controls. Merging a row must not hide independent secondary actions. In Views, inspect label associations, content descriptions, focusability and accessibility importance; do not add a description to every text label or replace its meaningful text with a test identifier. Check RTL order and touch/keyboard focus. [Compose semantics](https://developer.android.com/develop/ui/compose/accessibility/semantics) feeds both accessibility and testing, but a semantic assertion does not prove spoken navigation.

## Back, lifecycle and recovery

Keep the existing navigation owner. If standard navigation already handles Back, repair its route/state rather than intercepting Back globally. For temporary interception such as unsaved edits, use the compatible Compose handler or lifecycle-aware AndroidX callback enabled only in the affected state. In a Fragment, callbacks affecting its views should follow the view lifecycle. Restore normal dispatch when the condition ends; avoid recursive dispatcher calls while the same callback remains enabled. Predictive progress/cancellation must not commit a navigation or destructive action before completion. Check [predictive Back](https://developer.android.com/develop/ui/compose/system/predictive-back) against installed navigation/activity versions and the app's target, plus [custom Back lifecycle](https://developer.android.com/guide/navigation/navigation-custom-back).

Preserve form state across rotation, recreation, supported window changes and background/resume using the existing ViewModel/saved-state model. Avoid moving persistent work into a composable or repeating it on recomposition. Keep long-running collection and requests tied to their intended lifecycle; reject stale results after navigation. Fix loading/error/retry state at the existing owner, retain edits on failure and prevent duplicate submissions. Do not use `configChanges`, a locked orientation, a disabled system gesture or a reduced font scale to conceal a defect. [Configuration changes](https://developer.android.com/guide/topics/resources/runtime-changes) are normal runtime inputs.

For performance, reproduce the same list/data/device scenario before changing keys, item reuse, state reads or main-thread work. Verify selection, scroll restoration and error states after the patch. Report measured frame/latency results with build mode and device; changing to a lazy container alone does not establish an improvement.

## Acceptance and evidence

Compose and Views/XML each need their own modification and runtime case. Record code/build revision, actual application target, OS/API, target SDK, library versions, emulator/device model, window, font scale, locale, appearance, navigation mode and scenario.

| Check | Observable result |
|---|---|
| Diagnostic mode | Source remains unchanged; findings identify actual composable/XML/controller/state and separate reproduction from inference. |
| Authorized modification | A focused framework-appropriate diff fixes the reported defect while preserving data, theme resources and navigation ownership. |
| Insets/IME | Last field/action stays operable with keyboard, bars, cutout and applicable gesture/three-button navigation; repeated inset dispatch does not grow padding. |
| Text/window | Representative large text/display scaling, long localized content, narrow/rotated window and supported adaptive transitions retain readable content and work in progress. |
| Back/state | Complete and cancel Back where supported; test dirty/clean form, error/retry, recreation and resume without duplicate submission or lost edits. |
| Native accessibility | Check semantic/native tree and complete the affected journey with TalkBack; verify names, role/value/state, reading order and independent actions. |
| Appearance/performance | Relevant light/dark states remain legible; performance claims have comparable measurements on the actual target build. |

Run the project's existing Gradle build/lint and suitable Compose UI tests or Espresso/instrumentation. Discover actual module, variant and connected target before constructing commands. Automated accessibility checks are useful when available in the installed versions; do not upgrade Compose to enable them automatically. [Android accessibility testing](https://developer.android.com/develop/ui/compose/accessibility/testing) explicitly combines automated and manual checks. A browser capture, source parse, semantic test or successful build alone does not pass TalkBack, gesture behavior or performance. If SDK/emulator/device access is unavailable, list the unexecuted checks. Prefer isolated devices; record and restore any changed OS font, accessibility, theme or navigation settings.

Primary documentation reviewed 2026-10-29. Recheck version-dependent behavior against the product's actual SDK and dependencies before applying a recipe.
