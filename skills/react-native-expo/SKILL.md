---
name: react-native-expo
description: React Native and Expo development workflow covering Expo Router, native modules, permissions, app config, EAS Build, EAS Update, EAS Submit, iOS and Android release profiles, device testing, performance, accessibility, and store readiness. Use when building or debugging mobile apps with React Native or Expo.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# React Native Expo

Use this skill when building, debugging, testing, or releasing a mobile app with React Native, Expo, and EAS.

## Core Scope

- Expo managed workflow, development builds, Expo Router, app config, and native modules
- iOS and Android permissions, entitlements, deep links, push notifications, and assets
- EAS Build, EAS Update, EAS Submit, release channels, runtime versions, and store releases
- Device testing, performance, crash reporting, accessibility, and offline behavior
- React Native state, navigation, forms, networking, storage, and platform-specific UI

## Workflow

1. Identify workflow: Expo Go, development build, prebuild, bare React Native, or EAS-managed release.
2. Check SDK version, native dependencies, app config, runtime version, and build profiles.
3. Reproduce issues on a real device or simulator matching the target platform.
4. Separate JavaScript updates from native binary changes.
5. Test preview builds before production submission.
6. Verify permissions, deep links, push notifications, crash reporting, and store metadata.
7. Document release profile, update channel, and rollback path.

## Expo And EAS Rules

- Use development builds when native modules or app config differ from Expo Go.
- Use EAS Build profiles for development, preview, and production.
- Use EAS Update only for compatible JavaScript/assets changes under the same runtime version.
- Submit new binaries when native code, permissions, runtime version, or store-required metadata changes.
- Test updates by force closing and reopening preview or production-like builds.

## Mobile Checks

- Test on both iOS and Android when UI, permissions, storage, or notifications are touched.
- Check small screens, large text, dark mode, offline behavior, slow networks, and app background/foreground transitions.
- Avoid web-only assumptions such as hover, unlimited memory, or synchronous local storage.
- Keep secrets out of client bundles; mobile apps are distributed to users.
- Add crash reporting and release identifiers before production.

## Handoff

- Native component state and views remain owned here. Optionally reuse platform-neutral loading, error, cancellation, and optimistic-update guidance from `react-ui-patterns` without activating its web frontend baseline. For an actual web target, read `frontend-design` before visible web UI changes.
- Use `typescript-development` for type-safe implementation.
- Use `auth-integration` for mobile auth, OAuth redirects, sessions, and secure storage.
- Use `testing-strategy` for mobile test planning.

## References

- Expo Workflow Overview: `https://docs.expo.dev/workflow/overview/`
- EAS Build: `https://docs.expo.dev/build/introduction/`
- EAS Update: `https://docs.expo.dev/eas-update/getting-started/`
- EAS Submit: `https://docs.expo.dev/submit/introduction/`
