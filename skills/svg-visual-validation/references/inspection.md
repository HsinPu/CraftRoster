# Inspection helper contract

`scripts/inspect_svg.py` is original CraftRoster code inspired by the upstream distinction between structural and visual evidence. It is deliberately a small preflight, not a port of the upstream validator.

Input is one local UTF-8 XML SVG, maximum 5 MiB, 10,000 elements and 128 levels. It rejects DTD/entity declarations before parsing. Exit codes: 0 means its checks passed (warnings/features may remain); 1 means structural/profile errors; 2 means input/usage failure. It writes one JSON report to stdout and leaves the input unchanged.

Both profiles check the root namespace, finite positive viewBox dimensions when provided, duplicate IDs, and missing local `href`, `url(#...)` and ARIA ID references. A missing viewBox produces a sizing warning rather than rejecting every legal SVG. It records a SHA-256 of the input bytes and counts tags, IDs, CSS, animation and external-resource features.

The static profile rejects active/embedded features outside its limited static-vector contract, including processing instructions such as `xml-stylesheet`. The web profile accepts their presence for later browser investigation and emits warnings, including script/event/external-content risks. Processing instruction contents are not interpreted or fetched; review their resources separately. A web preflight pass is never permission to execute arbitrary uploaded SVG.

Limitations: it does not validate path grammar, CSS syntax/cascade, numeric geometry attributes, reference cycles, resource origin policy, computed bounds, fonts, paint semantics, animation timing, XML schema conformance or accessibility. CSS escaping and stylesheet text can hide references it does not recognize. Its bounds limit parsing work; it is not a security sandbox or upload sanitizer. Use an isolated maintained renderer and a dedicated sanitization policy for untrusted uploads. Do not add arbitrary source content to a privileged HTML page for inspection.

Run from the package's resolved location; no fixed home/temp paths or writable global state are needed. Browser/render tooling remains optional and separate. The report's input hash identifies the bytes checked, not a proof of any later render; independently hash or bind the renderer's actual input when recording visual evidence.
