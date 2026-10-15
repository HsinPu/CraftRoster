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
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
MAX_BYTES = 5 * 1024 * 1024
MAX_ELEMENTS = 10000
MAX_DEPTH = 128
MOTION = {"animate", "animateMotion", "animateTransform", "set"}
URL_ATTRIBUTES = {"fill", "stroke", "filter", "clip-path", "mask", "marker",
                  "marker-start", "marker-mid", "marker-end", "cursor", "style"}
SPACE = " \t\r\n\f"
NUMBER = r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?"
SEPARATOR = r"(?:[ \t\r\n]+(?:,[ \t\r\n]*)?|,[ \t\r\n]*)"
VIEWBOX = re.compile(rf"[ \t\r\n]*{NUMBER}(?:{SEPARATOR}{NUMBER}){{3}}[ \t\r\n]*")


def css_urls(text):
    """Scan URL tokens, skipping comments/ordinary strings; not a CSS parser.

    Each character is consumed once, including escaped identifiers and strings.
    Unsupported URL syntax is surfaced for host review instead of guessed.
    """
    targets, features = [], set()
    index, size = 0, len(text)
    importing = False

    def escape(start):
        end = start + 1
        if end == size:
            return "\ufffd", end
        if text[end] in "\r\n\f":
            return "", end + (2 if text[end:end + 2] == "\r\n" else 1)
        if text[end] in "0123456789abcdefABCDEF":
            stop = end
            while stop < size and stop - end < 6 and text[stop] in "0123456789abcdefABCDEF":
                stop += 1
            number = int(text[end:stop], 16)
            value = chr(number) if 0 < number <= 0x10ffff and not 0xd800 <= number <= 0xdfff else "\ufffd"
            if stop < size and text[stop] in SPACE:
                stop += 2 if text[stop:stop + 2] == "\r\n" else 1
            return value, stop
        return text[end], end + 1

    def string(start):
        quote, output, end = text[start], [], start + 1
        while end < size:
            char = text[end]
            if char == quote:
                return "".join(output), end + 1, True
            if char in "\r\n\f":
                return "", end + 1, False
            if char == "\\":
                value, end = escape(end)
                output.append(value)
            else:
                output.append(char)
                end += 1
        return "", end, False

    while index < size:
        char = text[index]
        if text.startswith("/*", index):
            stop = text.find("*/", index + 2)
            if stop < 0:
                features.add("unparsed-css-url")
                break
            index = stop + 2
            continue
        if char in "\"'":
            _, index, _ = string(index)
            continue
        if char in ";{}":
            importing = False
        if char.isalnum() or char in "_-\\" or ord(char) >= 128:
            start, word = index, []
            while index < size:
                char = text[index]
                if char == "\\":
                    value, index = escape(index)
                    word.append(value)
                elif char.isalnum() or char in "_-" or ord(char) >= 128:
                    word.append(char)
                    index += 1
                else:
                    break
            name = "".join(word).lower()
            if name == "import" and start > 0 and text[start - 1] == "@":
                importing = True
                features.update({"stylesheet-import", "external-reference"})
            if name != "url" or index == size or text[index] != "(":
                continue
            index += 1
            while index < size and text[index] in SPACE:
                index += 1
            valid = True
            if index < size and text[index] in "\"'":
                value, index, valid = string(index)
            else:
                output = []
                while index < size and text[index] != ")" and text[index] not in SPACE:
                    char = text[index]
                    if char in "\"'(" or ord(char) < 32:
                        valid = False
                    if char == "\\":
                        if index + 1 == size or text[index + 1] in "\r\n\f":
                            valid = False
                        value, index = escape(index)
                        output.append(value)
                    else:
                        output.append(char)
                        index += 1
                value = "".join(output)
            while index < size and text[index] in SPACE:
                index += 1
            if not valid or index == size or text[index] != ")":
                features.add("unparsed-css-url")
            else:
                if not importing:
                    targets.append(value)
                index += 1
            continue
        index += 1
    return targets, features


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
            if VIEWBOX.fullmatch(viewbox) is None:
                raise ValueError()
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
        found, extra = css_urls(value)
        features.update(extra)
        for value in found:
            target(value)

    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        tags[tag] += 1
        is_svg = element.tag.startswith(f"{{{SVG}}}")
        if not is_svg:
            features.add("foreign-content")
        if is_svg and tag in MOTION:
            features.add("animation")
        if is_svg and tag == "style":
            features.add("css")
            urls("".join(element.itertext()))
        if is_svg and tag in {"script", "foreignObject", "image", "feImage"}:
            features.add({"script": "script", "foreignObject": "foreign-content",
                          "image": "bitmap-or-linked-image", "feImage": "bitmap-or-linked-image"}[tag])
        identity = element.get("id")
        if identity is not None:
            if not identity or re.search(r"\s", identity):
                report["errors"].append(f"Empty or whitespace-containing ID: {identity!r}")
            if identity in ids:
                report["errors"].append(f"Duplicate ID: {identity}")
            ids.add(identity)
        if not is_svg:
            continue
        href = element.get("href", element.get(XLINK_HREF))
        if href is not None:
            target(href)
        if "href" in element.attrib and XLINK_HREF in element.attrib and element.get("href") != element.get(XLINK_HREF):
            report["warnings"].append("href overrides a different xlink:href; check legacy viewers if required")
        for name, value in element.attrib.items():
            # Namespaced editor metadata is not an SVG event, style or IDREF.
            if name.startswith("{"):
                continue
            if name.lower().startswith("on"):
                features.add("event-handler")
            if name == "style":
                features.add("css")
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
