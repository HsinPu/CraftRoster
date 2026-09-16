---
name: app-store-release
description: Mobile app store release workflow covering App Store Connect, TestFlight, Google Play Console, signing, metadata, privacy labels, data safety, review guidelines, rollout, rejection handling, and rollback planning. Use when preparing, reviewing, or troubleshooting App Store, TestFlight, Google Play, internal testing, closed testing, or staged mobile releases.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# App Store Release

Use this skill when preparing, reviewing, or troubleshooting mobile app releases for Apple's App Store, TestFlight, Google Play, internal testing, closed testing, or staged production rollout.

## Core Scope

- App Store Connect, TestFlight, Google Play Console, internal/closed/open testing tracks
- Bundle IDs, package names, versioning, build numbers, app signing, certificates, and provisioning
- Store metadata, screenshots, descriptions, categories, age rating, support URLs, and privacy policy
- Apple privacy labels, Google Play Data Safety, permissions declarations, and review guidelines
- Phased release, staged rollout, hotfixes, rejection handling, and rollback planning

## Workflow

Select the requested mode before acting: **prepare** produces local release artifacts and a readiness record; **review** inspects available evidence without mutations; **execute** performs the authorized submission or rollout. Carry forward an existing grant for the exact app, build, track, and effects; do not ask again for the same unchanged authorization. Preparing or reviewing a release does not authorize submission, metadata updates, track promotion, or production rollout.

1. Identify the mode and release target: internal test, beta, phased rollout, production, or hotfix.
2. Verify app identifier, signing, version, build number, release notes, and target backend.
3. Prepare or inspect store metadata, screenshots, privacy policy, data disclosures, and permission declarations. Write to the store only within the authorized execute scope.
4. Inspect exact-build test evidence in review mode. Run tests against the local build or an existing testing track only when execution and its effects are within scope.
5. Review platform policies and high-risk features before submission.
6. In prepare or review mode, return readiness evidence and remaining gaps. In execute mode, submit only the authorized build to the authorized track, monitor status, and keep a rejection response plan ready.
7. Roll out only within the authorized release scope, gradually when risk is meaningful, and monitor crashes, reviews, analytics, and backend errors. An internal-test submission does not authorize production promotion.

## Apple Checklist

- Confirm App Store Review Guidelines fit the app behavior.
- Use TestFlight for internal and external beta testing.
- Keep privacy labels aligned with actual SDKs, analytics, tracking, and data collection.
- Verify sign-in requirements, account deletion, subscriptions, in-app purchases, and permission prompts.
- Ensure screenshots and metadata reflect the shipped build.

## Google Play Checklist

- Use internal testing for fast smoke checks and closed/open testing when broader validation is needed.
- Complete Data Safety, privacy policy, content rating, target audience, ads, and permissions forms.
- Use app bundles, Play App Signing, and staged rollout when appropriate.
- Treat policy violations in test tracks seriously; they can block later releases.
- Verify track promotion uses the intended artifact and release notes.

## Release Risk Checks

- Confirm production API endpoints, feature flags, payment modes, push certificates, OAuth redirects, and deep links.
- Check crash reporting and source maps/symbol files before rollout.
- Prepare support response for known issues and store review questions.
- Know whether rollback requires disabling a feature flag, shipping a new build, or stopping rollout.

## Handoff

- Use `mobile-app-testing` for release candidate test planning.
- Use `react-native-expo` for EAS Build, EAS Submit, and EAS Update details.
- Use `flutter-development` for Flutter build and release checks.
- Use `deployment-operations` for staged rollout and rollback strategy.

## References

- Apple App Review Guidelines: `https://developer.apple.com/app-store/review/guidelines/`
- TestFlight: `https://developer.apple.com/testflight/`
- Google Play Internal Testing: `https://support.google.com/googleplay/android-developer/answer/9845334`
- Google Play Console Help: `https://support.google.com/googleplay/android-developer/`
