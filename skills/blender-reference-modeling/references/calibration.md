# Calibration and comparison

- Compare orthographic views only after matching the world window, ground line, facing axis and units. Keep absolute dimensions as a separate check even when image silhouettes align.
- Perspective photos require a camera estimate. Mark lens and depth ambiguity; fix the camera before reshaping geometry to compensate for an incompatible lens.
- For concept art, identify the intended exaggerations and preserve them. Realism is not automatically an improvement.
- Save references with source identity and applicable asset-use rights. A software repository's MIT license does not license arbitrary images found through it.
- Use a clay/silhouette render to judge shape, checker or wire views for topology/UV diagnosis, and material/game-camera views for the final read. Crops, alpha mattes, resize methods and background extraction must be consistent and recorded.
- Bounding-box alignment hides translation and uniform scale. World-registered orthographic comparisons require a known reference window; uncalibrated perspective references cannot supply that evidence.
- Compare at delivery resolution and intended gameplay size. A detailed close-up can pass while the asset becomes unreadable in-game.
- Define tolerances from the actual brief, camera and asset role. If scores plateau, list the remaining geometric/camera ambiguity and choose a bounded correction; avoid endless detail churn.
