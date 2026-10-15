# SVG optimization review — 1.1.1

Reviewed the seven SVG Skill entrypoints, their local conceptual references, install/dependency/routing data, and the original inspection helper at baseline `cd39c662913f6924b478f20bd49314e73e5b95c8`.

The seven outcome boundaries and independent installation model were consistent. Improvements concentrate on executable preflight accuracy and two concise animation recipes; no new package, category, runtime dependency or mandatory sibling relationship is introduced.

## Reproduced defects and corrections

| Before | Correction | Evidence |
|---|---|---|
| CSS comments and ordinary quoted strings containing `url(#missing)` produced hard reference errors | Token scanning skips comments and non-URL strings | CLI regression cases distinguish literal text from real paint references |
| CSS-escaped `url` names/fragments and stylesheet imports were not inventoried reliably | Decode token escapes, inventory imports, flag malformed/unsupported URL syntax | Escaped local targets resolve; missing targets still fail; imports remain browser-review features |
| Both `href` and `xlink:href` were treated as active targets | Follow SVG 2 precedence, including empty unqualified href; warn about a differing legacy fallback | Active target succeeds even if the ignored fallback is broken; XLink-only references are still checked |
| Namespaced editor attributes or an editor `style` element were treated as SVG events, links or CSS | Dispatch according to namespace; retain foreign-content inventory | Metadata no longer creates missing-reference errors; static foreign-content rejection remains |
| Python float parsing accepted underscores and the separator split accepted repeated commas in viewBox | Check SVG number/separator grammar before finite/dimension checks | Legal fractions/signs/exponents pass; underscores, malformed separators, nonfinite and nonpositive extents fail |
| The existing Three.js provenance fixture retained the pre-SVG whole-manifest hash | Refresh its explicit local digest after reviewing the unchanged Three.js mapping and new SVG records | Original five provenance fixture checks pass, including license distinctions, pins and read-only broker behavior |

The helper remains a preflight, not a complete CSS/SVG grammar validator, renderer, sanitizer or security sandbox. Inactive CSS rules, custom properties, stylesheet bases, imported content and runtime mutation still need the actual target host. No parser pass is presented as visual approval.

## Practical animation examples

Added two original examples to [state-transitions.md](../../../skills/svg-animation/references/state-transitions.md):

- A nested placement/rotation with explicit `transform-box` and `transform-origin`.
- An open-stroke reveal using normalized `pathLength`, unitless dash values and a visible reduced-motion state.

Executed both examples directly from the Markdown source in headless Chrome **154.0.8037.99** using the available Playwright runtime. Under normal motion, two animations were observed; at 400 ms the stroke offset was `0.555556` and the rotation matrix was nonidentity. Finishing yielded stroke offset `0`; the parent placement remained `translate(48 40)` and the shape stayed within its viewport. With `prefers-reduced-motion: reduce`, there were zero animations, no rotation and a final visible stroke (`dashoffset = 0`). These are browser behavior checks, not a cross-browser or aesthetic-fidelity claim.

## Verification

The focused helper regression suite grew from nine to fifteen groups. Existing checks remain active: static/web distinction, PI inventory, actual paint references, duplicate IDs, DTD/entities, resource restrictions, bounded input/depth, hashes and source non-mutation.

Final verification under Node 24.19.0: the full repository validator passed; the helper suite passed fifteen groups; the PowerShell 7 suite passed twenty-seven checks including seven independent package installs, both purpose bundles and updates; packaging passed with 2,778 files, 76 declared entrypoints and 13 runtime manifests. The five provenance fixture checks, sixteen review-registry tests, fifty-five dependency tests and twenty eval-definition tests also passed. The two changed SVG packages produced no upstream originality findings across seventeen comparisons. Behavioral and routing eval definitions remain unchanged and are not claimed as executed live model tasks.

The previous GitHub run also reported a macOS PTY Ctrl+C timeout and a pinned Agent source failure. These are separate from SVG inspection; this patch does not suppress those checks or claim that all GitHub jobs are green.
