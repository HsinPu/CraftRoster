---
name: threejs-webxr-accessibility
description: "WebXR and immersive-accessibility design for Three.js. Use for VR or AR sessions, reference spaces, controllers, hands, locomotion, hit testing, anchors, XR performance, motion comfort, session lifecycle, seated or standing modes, inclusive immersive input, and coordinated non-XR fallback."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Three.js WebXR Accessibility

Make immersive capability progressive and keep essential content and actions available outside a headset.

This workflow requires `threejs-accessibility` for the non-XR fallback and the shared contracts bundled in `threejs-development`. The latter is a resource dependency; reading its contracts does not activate its full routing workflow. Reuse verified fallback evidence only when its source revision, supported actions, input modes, and device targets still match; retain `threejs-accessibility` as the owner of any changed fallback behavior.

## Workflow

1. Define supported XR modes, devices, session features, physical space, input sources, comfort constraints, HTTPS deployment, and the required non-XR fallback.
2. Read [accessibility-contract.md](../threejs-development/references/accessibility-contract.md) and assign general semantic, keyboard, screen-reader, caption, and reduced-motion behavior to `threejs-accessibility`.
3. Let the XR system own camera projection and pose while the application owns world origin and locomotion policy.
4. Map controller, hand, gaze, pointer, keyboard, and assistive alternatives to the same semantic actions.
5. Design seated and standing modes, reachable targets, scale cues, teleport or smooth locomotion options, and reduced-motion behavior.
6. Test session start, permission denial, interruption, device removal, recentering, controller changes, frame-budget pressure, non-XR continuation, and exit cleanup.

## Rules

- Do not require XR for information or transactions that need an accessible web path.
- Avoid forced camera motion, unexpected acceleration, and unreadable world-locked UI.
- Provide captions or text alternatives for essential spatial audio.
- Maintain visible focus and meaningful DOM semantics for surrounding controls.
- Verify feature support at runtime and degrade by capability.

## Handoff

Use `threejs-accessibility` as the primary owner for non-XR canvas semantics, focus, screen-reader access, sensory alternatives, and assistive-technology verification.

## Evidence

Return the XR capability matrix, reference-space and input design, comfort options, accessible fallback, session lifecycle tests, and device performance results.
