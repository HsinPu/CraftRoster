# Character construction and deformation

## Proportions and identity

Use head units only as a drawing aid. A realistic adult might use roughly 7.5–8 heads, a heroic design 8–9, or a stylized character 4–6; none is a biological rule. Measure the chosen reference's actual ratios. Track chin, shoulder line, ribcage, pelvis, knee and floor as landmarks. Compare shoulder and hip widths in both front and side views; a front-only match can hide a shallow skull or collapsed torso. Place elbow, wrist and knee centers before skin detail.

For likeness, document which views support each conclusion. Do not invent the unseen back of a hairstyle as a confirmed design. Block the skull and cheek planes before eyelids and nostrils. Common reference guides put eyes around the head's halfway line and ears around brow-to-nose height, but perspective, age and stylization change them.

## Face and body topology

Use closed eyelid rings that follow the eyeball and leave thickness at the lid rim. Blink requires the upper and lower surfaces to meet without slicing through the eyeball. Place a continuous lip border with enough supporting rows to hold both closed lips and an open mouth; mouth loops must flow into cheek and jaw structures rather than terminate in a pinched corner. Nasolabial and brow flow depends on the planned expression set. Two or three supporting rings can be a blockout starting point; a dialogue hero may need substantially more. Count alone never demonstrates expression quality.

Build shoulder flow around the deltoid and chest transition; a simple tube attached to a torso tends to collapse on arm raise. Give elbows, knees and finger joints supporting rows on both sides of the bend, with room for compression. Move high-valence poles away from the greatest curvature or strain. Triangles are acceptable where actual shading and motion tolerate them; keep n-gons out of sensitive deforming surfaces. Match edge spacing to visible deformation rather than enforcing uniform density everywhere.

## Clothing, armor and hair

Derive a garment shell from an owned body copy when useful, then add clearance and thickness before seam details. Clothing should follow its own construction seams and can share an atlas only when the texture plan allows it; upstream's absolute prohibition on shared UV space is not universal. Keep swap garments and rigid armor independently addressable. Do not delete covered body faces until all outfits and extreme poses are checked; cut only a delivery variant.

Choose hair by target: strand curves for a compatible cinematic renderer, textured cards for real-time realistic hair, sculpted high-poly for baking, or deliberate mesh clumps for a stylized silhouette. Card transparency, normals and strand conversion need their own target checks. Weight transfer from the body is an initialization, not a finished cloth deformation result.

## Worked stylized character

For a 1.5 m, five-head-tall messenger: make a 0.3 m head guide and place the body landmarks from the approved drawing. Keep body, tunic, boots, bag and hair clumps separate. Block the satchel and tunic before committing shoulder topology so the arm can clear them. Build the eyelids around actual eye spheres and test a closed blink; build lip/jaw rows around the required smile and jaw opening. Keep a clean mirrored master, then add approved asymmetry on a copy. Inspect arm raise and knee bend at the intended camera distance before densifying fingers.

## Failures and acceptance

A pinched smile needs redirected mouth-corner flow or additional supporting geometry, not more pores. A collapsing shoulder needs topology and joint placement checked before weight painting is blamed. Cloth clipping can come from insufficient garment clearance, wrong thickness, or weights; isolate the cause with simple poses. A faceted silhouette needs geometry where it affects outline; a smooth but featureless face needs form revision.

Deliver images of neutral front/side and expression/pose tests for the exact delivered revision, together with topology overlays. Technical acceptance checks finite coordinates, intended boundaries, material/UV splits, counts and modifiers. Visual acceptance checks identity, silhouette, eyelid contact, lip closure and retained joint volume. A rig or automatic retopology success flag is not proof of these.
