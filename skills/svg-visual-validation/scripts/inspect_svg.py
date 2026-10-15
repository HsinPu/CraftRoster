#!/usr/bin/env python3
"""Bounded, read-only SVG preflight; not a renderer, sanitizer or conformance checker.

Original CraftRoster implementation. Licensed under Apache-2.0.
"""
import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
MAX_BYTES = 5 * 1024 * 1024
MAX_ELEMENTS = 10000
MAX_DEPTH = 128
MOTION = {"animate", "animateMotion", "animateTransform", "set"}
URL_ATTRIBUTES = {"fill", "stroke", "filter", "clip-path", "mask", "marker",
                  "marker-start", "marker-mid", "marker-end", "cursor", "style"}
URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I)


def inspect(file, profile):
    report = {"schema_version": 1, "profile": profile, "input_sha256": None,
              "errors": [], "warnings": [], "features": [], "counts": {}}
    with Path(file).open("rb") as handle:
        data = handle.read(MAX_BYTES + 1)
    report["input_sha256"] = hashlib.sha256(data).hexdigest()
    if len(data) > MAX_BYTES:
        # This is not the whole-file hash when the read bound was exceeded.
        report["input_sha256"] = None
        report["errors"].append("Input exceeds 5 MiB limit")
        return report
    text = data.decode("utf-8-sig")
    if re.search(r"<!\s*(DOCTYPE|ENTITY)\b", text, re.I):
        report["errors"].append("DTD/entity declarations are unsupported")
        return report
    root = None
    processing_instruction = False
    depth = elements = 0
    try:
        for event, element in ET.iterparse(io.StringIO(text), events=("start", "end", "pi")):
            if event == "pi":
                processing_instruction = True
            elif event == "start":
                depth += 1
                elements += 1
                if root is None:
                    root = element
                if depth > MAX_DEPTH or elements > MAX_ELEMENTS:
                    report["errors"].append("Element/depth limit exceeded (10000/128)")
                    return report
            else:
                depth -= 1
    except ET.ParseError as error:
        report["errors"].append(f"Invalid XML: {error}")
        return report
    if root is None or root.tag != f"{{{SVG}}}svg":
        report["errors"].append("Root must be svg in the SVG namespace")
        return report
    viewbox = root.get("viewBox")
    if viewbox is None:
        report["warnings"].append("Missing viewBox; verify host sizing and scaling")
    else:
        try:
            values = [float(value) for value in re.split(r"[\s,]+", viewbox.strip())]
            if len(values) != 4 or not all(math.isfinite(value) for value in values) or min(values[2:]) <= 0:
                raise ValueError()
        except ValueError:
            report["errors"].append("viewBox needs four finite numbers and positive width/height")
    ids, references, features, tags = set(), set(), set(), Counter()
    if processing_instruction:
        # Do not attempt to interpret arbitrary PI pseudo-attribute syntax.
        # In particular xml-stylesheet can load CSS outside the SVG element tree.
        features.add("processing-instruction")

    def target(value):
        value = value.strip()
        if value.startswith("#"):
            if len(value) > 1:
                references.add(value[1:])
        elif value:
            features.add("external-reference")

    def urls(value):
        for match in URL.finditer(value):
            target(match.group(2))

    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        tags[tag] += 1
        if not element.tag.startswith(f"{{{SVG}}}"):
            features.add("foreign-content")
        if tag in MOTION:
            features.add("animation")
        if tag == "style":
            features.add("css")
            urls("".join(element.itertext()))
        if tag in {"script", "foreignObject", "image", "feImage"}:
            features.add({"script": "script", "foreignObject": "foreign-content",
                          "image": "bitmap-or-linked-image", "feImage": "bitmap-or-linked-image"}[tag])
        identity = element.get("id")
        if identity is not None:
            if not identity or re.search(r"\s", identity):
                report["errors"].append(f"Empty or whitespace-containing ID: {identity!r}")
            if identity in ids:
                report["errors"].append(f"Duplicate ID: {identity}")
            ids.add(identity)
        for attribute, value in element.attrib.items():
            name = attribute.rsplit("}", 1)[-1]
            if name.lower().startswith("on"):
                features.add("event-handler")
            if name == "style":
                features.add("css")
            if name == "href":
                target(value)
            if name in {"aria-labelledby", "aria-describedby"}:
                references.update(value.split())
            if name in URL_ATTRIBUTES:
                urls(value)
    for missing in sorted(references - ids):
        report["errors"].append(f"Missing local reference: {missing}")
    report["features"] = sorted(features)
    report["counts"] = {"elements": elements, "ids": len(ids), "tags": dict(sorted(tags.items()))}
    for feature in sorted(features):
        if profile == "static":
            report["errors"].append(f"Unsupported in static profile: {feature}")
        else:
            report["warnings"].append(f"Browser/host review required: {feature}")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Local UTF-8 SVG file")
    parser.add_argument("--profile", choices=("static", "web"), default="static")
    options = parser.parse_args()
    try:
        report = inspect(options.input, options.profile)
    except (OSError, UnicodeError) as error:
        print(json.dumps({"schema_version": 1, "profile": options.profile,
                          "input_sha256": None, "errors": [str(error)],
                          "warnings": [], "features": [], "counts": {}}, ensure_ascii=True))
        return 2
    print(json.dumps(report, ensure_ascii=True))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
