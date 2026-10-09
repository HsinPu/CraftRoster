---
name: document-to-markdown
description: Document-to-Markdown conversion workflow for turning DOCX, DOC, PDF, PPTX, HTML, RTF, Google Docs exports, and extracted document text into clean Markdown. Use when converting docs to markdown, docs 轉 Markdown, 文件轉 Markdown, docx to md, PDF to Markdown, marker pdf markdown, or when the final deliverable must be a reviewed .md file with preserved headings, lists, tables, links, images, and code blocks.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Document To Markdown

Use this skill when the primary goal is to convert an existing document into Markdown and deliver a cleaned `.md` result.

## Workflow

1. Identify the source format, target file path, and fidelity needs.
2. Choose the narrowest conversion path for the source: MarkItDown, Pandoc, Marker, Mammoth, PDF extraction/OCR, or existing plain text.
3. Preserve structure first: headings, lists, tables, links, images, captions, footnotes, and code blocks.
4. Write an initial Markdown draft without overwriting the source document.
5. Review and clean the Markdown before final delivery: fix heading hierarchy, list spacing, table syntax, links, image references, code fences, repeated headers/footers, OCR noise, and broken line wrapping.
6. State any known losses: layout, comments, tracked changes, page numbers, embedded media, OCR uncertainty, or unsupported formatting.

## Tool Selection

- Use MarkItDown for broad best-effort conversion across Office, PDF, HTML, images, CSV/JSON/XML, ZIP, and EPUB-like inputs.
- Use Pandoc when DOCX/PPTX/HTML structure, heading hierarchy, lists, tables, footnotes, or code blocks matter.
- Use Marker for complex PDF/image/PPTX/DOCX documents when tables, formulas, images, headers/footers, OCR, or layout-aware Markdown/JSON/HTML extraction matter; check dependency, compute, and licensing constraints before relying on it.
- Use Mammoth when DOCX semantic structure matters more than visual styling.
- Use PDF/OCR tooling when the source is scanned, image-only, or layout-heavy.
- Load `markdown-writer` for the required Markdown baseline after every conversion, even when the converter succeeds, and apply manual cleanup. This companion is part of the core conversion package; the format-specific Skills below are needed only for their stated branches. If the baseline is unavailable, preserve the draft and report the final Markdown review as incomplete.

## Quality Gate

- The `.md` file has one logical title, ordered heading levels, readable paragraphs, and stable GFM syntax.
- Tables render as Markdown tables or are intentionally converted to lists when the table is too complex.
- Images and attachments are referenced with useful alt text and local relative paths when available.
- Code blocks use fenced blocks with language hints when the source implies code.
- Repeated headers, footers, page numbers, broken hyphenation, and OCR artifacts are removed or noted.

## Safety

- Keep source files unchanged unless the user explicitly asks to replace them.
- Prefer local file conversion. Do not fetch remote URLs or cloud documents unless the user asks and the environment allows it.
- Treat private documents, credentials, customer data, contracts, medical/legal/tax records, and identity documents as sensitive.
- Do not promise pixel-perfect layout. Markdown is structural, not a full visual clone.

## Handoff

- Use `markdown-writer` for final Markdown style, GFM cleanup, headings, lists, tables, and documentation polish.
- Use `word-document-ops` when `.docx` formatting, comments, tracked changes, or Word layout must be inspected or preserved.
- Use `pdf-operations` when a PDF requires OCR, page-aware extraction, layout checks, splitting, merging, or image extraction.
- Use `workspace-google-ops` when the source is a Google Docs file that must first be located, exported, or accessed through Drive.
- Use `summary-ops` when the user wants a concise summary rather than a faithful Markdown conversion.

For detailed conversion choices and cleanup checks, read [reference/conversion-workflows.md](reference/conversion-workflows.md).
