# Windows native interface improvement

Use for **WinUI / Windows App SDK** or **WPF** source. For Electron/Tauri, apply the Windows interaction checks here and use [cross-platform-frameworks.md](cross-platform-frameworks.md) for shell ownership; their renderer is not a native XAML view. Read [workflow-and-evidence.md](workflow-and-evidence.md) for mode and evidence rules.

## Establish the target

Inspect the solution, `.csproj`, target framework, Windows App SDK/.NET versions, XAML namespaces, minimum Windows version, resource dictionaries, ViewModel/command owner and existing build/tests. `Microsoft.UI.Xaml` and `System.Windows` APIs are different. Record the execution host separately from the app target. Do not upgrade SDKs, migrate WPF to WinUI, rewrite state management or change DPI awareness just to polish a form.

Preserve the application's design system and intended information density. Use existing native controls and resource tokens before introducing custom visual or input infrastructure. Apply only recipes connected to an observed defect.

## Rules and source repairs

| Observed defect | WinUI repair location | WPF repair location | Check after the patch |
|---|---|---|---|
| Text or actions clip at narrow width or large text | Page/control XAML: replace unnecessary fixed `Height`/`Width` with content sizing, `Auto`/`*` grid allocation, wrapping and appropriate scroll ownership. Keep text scaling enabled. | View XAML: adjust grid rows/columns, stretch, `TextWrapping`, `MinWidth` and constraints; inspect bindings to the application's text-size preferences. | Same long/localized data at supported minimum window size and text/display settings; actions remain reachable without overlapping. |
| Blurry or displaced content after moving displays | Inspect current framework/interop DPI handling before changing manifest or native window hooks. | Inspect actual .NET/framework DPI support, manifest and any Win32-hosted controls. | On Windows, move the window between supported DPI displays; compare sharpness, hit targets and popups. Text size and display DPI are separate tests. |
| Shortcut, Tab or dialog focus fails | Existing `KeyboardAccelerator`, command and focus paths; put input interception at the narrowest owner. Restore invoking focus after the dialog closes. | Existing `InputBindings`/`RoutedCommand`, command enablement and focus scope; preserve text editing and dialog return focus. | Keyboard-only task, Shift+Tab, inner-control arrows, Enter/Esc, menu enablement and cancellation. No shortcut steals ordinary text entry. |
| Theme or accessible meaning is lost | Existing `{ThemeResource ...}`/theme dictionaries and native controls; supply missing `AutomationProperties.Name`/label relationships and state. | Existing theme service and dynamic/system resource brushes; supply appropriate automation properties or peers. | Light/dark where supported, contrast themes, UI Automation names/roles/state, and an actual Narrator task. An automation ID alone is not an accessible name. |
| Recycled row shows another item's state or scrolling stalls | Correct item identity/binding state in model/ViewModel and inspect the control's supported virtualization path. | Inspect items panel, `ScrollViewer.CanContentScroll`, virtualization and recycling; bind expanded/selected state to items rather than recycled containers. | Fixed data set, sort/filter/selection and scroll away/back; measure the reported stall on the same machine. |
| Retry or fast clicking loses input or repeats work | Existing ViewModel/command: explicit pending/error/retry state, cancellation/lifetime and UI-thread update. | Same ownership in the existing ViewModel/command; use the project's dispatcher/concurrency conventions. | Success, empty, failure/retry, rapid repeat, cancel and close/reopen; verify input and selection survive as intended. |

Do not make static explanatory text focusable merely to expose it to a screen reader. Prefer the native semantic text/control model; custom controls may need a framework-specific automation peer and supported patterns. Check the actual role, value and actions rather than assuming that a label fixed the entire interaction.

### Small patch example: a clipped description

For an existing `TextBlock` whose description is clipped, remove the unnecessary fixed height and allow `TextWrapping="Wrap"`; also ensure its parent row is content-sized and gives finite available width. Preserve its text binding, style and resource colors. This is not sufficient when a parent still clips or an outer scroller measures the child without a width constraint. Reproduce the original width/text-scale combination after editing. WPF does not gain WinUI's text-scale behavior by adding a similarly named WinUI property.

### Small patch example: row state under recycling

If expanding one WPF row causes another to appear expanded after scrolling, move `IsExpanded` ownership into the item model and bind it through the existing item template. Inspect virtualization before changing its settings; replacing a virtualized list with a plain stack can hide the state bug while creating a performance regression. Keep data virtualization and UI-container virtualization distinct.

## Native verification and reporting

Treat `windows-winui` and `windows-wpf` as separate acceptance cells. Each needs a read-only diagnosis case, an authorized source repair, and affected scaling/theme/accessibility checks. Use the repository's documented build/test commands with installed matching tooling; record command, target/configuration and outcome. A Windows host alone does not prove the required SDK or application ran.

Run the affected native application. Capture the revision, OS, framework, data, window size and tested settings. Exercise keyboard/focus and relevant dialogs in addition to native captures. Inspect UI Automation with available tools, then separately perform Narrator or the product's supported screen-reader journey; a tree inspection is not a completed screen-reader test. Performance conclusions require comparable measurements, not screenshot timing.

Prefer isolated test settings. Record and restore any host text/display/theme setting changed during testing. If the runtime, display arrangement or assistive technology is unavailable, complete feasible source work and state exactly which native acceptance checks remain unexecuted. Browser mockups do not close those gaps.

## Primary references

Reviewed 2026-10-29. These are decision references, not copied templates; confirm availability against the target versions before applying APIs.

- [Microsoft: accessibility and UI Automation](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)
- [Microsoft: accessible text and scaling](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessible-text-requirements)
- [Microsoft: keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions)
- [Microsoft: desktop High DPI behavior](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows)
- [Microsoft: WPF control performance and recycling](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/advanced/optimizing-performance-controls)
