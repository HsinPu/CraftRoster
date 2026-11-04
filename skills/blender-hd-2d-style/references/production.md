# Pixel actors on a 3D stage

## Establish the hybrid

Record sprite pixel dimensions, apparent actor height and camera behavior. Decide whether actors are unlit art, receive approximate scene light, or use paired normal/depth assets. Pixel actors are not automatically volumetric geometry. Obtain or author permitted sprite art; do not invent supplied asset provenance.

## Stage recipe

Build a small street or interior stage from broad 3D masses. Place a sprite plane at its intended world height with origin at the feet. Use nearest sampling for the actor and alpha handling appropriate to the installed renderer. Inspect visible edge color for dark fringes. For a fixed camera align the plane once; for movement define a camera-facing constraint while preventing unintended tilt or scale change. Place a simple shadow proxy only if needed and make its approximation explicit.

Choose a moderate long lens or orthographic-like framing consistent with the reference. Maintain a stable pixel-to-screen relationship: a 48-pixel sprite occupying 96 output pixels gives an integer 2x test, unlike an arbitrary 1.7x upscale. Keep environment texture density subordinate to the actor. Use a theatrical key and fill with pools emphasizing the path. Add depth of field after actor readability: focus near the hero feet/face plane, and compare blur-off. Strong miniature blur is optional, not mandatory. Use fog and glow sparingly so the sprite edge and depth order remain clear.

## Repair and acceptance

A cardboard cutout needs better occlusion/contact and a declared light response, not indiscriminate normal maps. A shimmering actor needs pixel scale/camera treatment corrected. Blurry focal sprites need reduced aperture effect or focus repair.

Require sprite alpha crop, blur-off final, treated final and near/far occlusion images. Animated billboarding needs viewed motion evidence. Accept crisp intended pixel scale, stable ground contact, coherent depth order and a stage that supports rather than swallows actors. These Blender shots do not implement a full HD-2D game renderer.
