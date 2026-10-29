# Cross-platform framework boundaries

Read the installed framework version, supported product targets and existing navigation/theme/state owners. A common codebase does not make OS behavior identical. These branches cover Flutter/RN on iOS/Android and Electron/Tauri on Windows/macOS; other combinations require their own API and runtime evidence.

## Flutter — iOS and Android

Load the applicable OS interaction rules and, when installed, `flutter-development`. Inspect constraint propagation before changing a widget: for a clipped label in a row, choose flexible space and natural wrapping; for an overflowing form, give the content a bounded scroll owner and preserve field state/focus. Trace `SafeArea`, view insets and scaffold keyboard resizing together to avoid applying the same obstruction twice.

Use the existing `ThemeData`/color roles and text theme, preserve system text scaling, semantic labels/actions and focus order. Adapt layout from available constraints and input capabilities rather than a device-name check. Keep navigation/Back behavior in the existing Router/Navigator ownership. Use framework APIs compatible with the repo's Flutter version; do not disable system scaling or change SDKs to avoid a defect.

Run existing analysis/widget/integration tests and exercise the affected iOS and Android targets, including keyboard, Back/cancel and relevant text/appearance settings. A web preview or widget test alone does not validate the native route or assistive technology.

## React Native / Expo — iOS and Android

Use `react-native-expo` when available and relevant. Confirm whether this project is Expo or bare RN before selecting APIs. Repair layout in the actual native component hierarchy: bounded flex/scroll, content sizing, the existing safe-area provider and keyboard-avoidance owner. Do not paste DOM/CSS properties into native views or duplicate IME padding.

Preserve font scaling, accessibility roles/names/state, shared theme tokens and list identity. Use `Platform` or `.ios`/`.android` files for real platform differences while keeping domain behavior shared. Route Back and presentation through the installed navigation library; its version and OS support constrain the repair. Separate component changes from a native module change, and avoid an Expo workflow migration as polish.

Check the current lint/type/component tests, then the actual native builds and exercised flows on supported iOS/Android targets. Browser rendering does not prove VoiceOver/TalkBack, navigation gestures, keyboard overlap or native permission recovery.

## Electron — renderer and shell

Use web rules for the renderer. `desktop-development`, when available, owns Electron main/preload/window/menu/IPC work; it does not describe WPF or AppKit implementation. Follow Windows/macOS interaction expectations for the affected shell.

For a clipped settings window, inspect renderer reflow and `BrowserWindow` size constraints together. Repair the correct owner instead of scaling the entire page. For menu/shortcut/focus defects, trace the main-process command, focused window and renderer action, keeping one domain action owner. Preserve context isolation, sandbox settings, narrowly exposed preload APIs and IPC validation; do not enable Node integration to simplify a UI patch.

Test both renderer state and actual window/menu/keyboard behavior on the product's supported Windows/macOS targets. Browser-only testing misses shell actions. A backend/IPC refactor with no affected UI contract does not need UI review merely because it runs inside Electron.

## Tauri — WebView and native core

Identify Tauri major version, frontend, Rust commands/plugins, capabilities and affected OS WebView. Web rules own HTML/CSS/component repairs. Native-window/menu/command problems require the actual Tauri APIs and target-specific Windows/macOS checks; Electron `BrowserWindow` or preload recipes are not substitutes.

For a menu action that reaches the wrong window, inspect event/command targets, window labels and focus/lifetime; preserve existing capability scopes and payload validation. For visual clipping, repair frontend constraints and actual native sizing separately. Do not broaden filesystem/command capabilities, CSP or remote debugging exposure to make a design check easier.

Build/run with the repository's existing Tauri workflow. Verify the affected WebView and shell on each supported target; Chromium behavior on Windows does not prove WKWebView behavior on macOS. Missing Mac tooling leaves the Mac acceptance cell unverified, even if Rust and frontend checks pass elsewhere.

## Primary references

Checked 2026-10-29; use documentation matching the repository version before selecting an API.

- [Flutter adaptive and responsive design](https://docs.flutter.dev/ui/adaptive-responsive)
- [React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Tauri process model](https://v2.tauri.app/concept/process-model/)
