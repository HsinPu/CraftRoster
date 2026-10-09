---
name: python-web-scraping
description: Build, modify, fix, and review Python web scrapers and extractors using requests, httpx, BeautifulSoup, lxml, XPath, pagination, feeds, normalization, retries, or polite crawling. Use when Python code collects structured data from static or lightly dynamic HTML rather than driving a browser; pair with python-development.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Python Web Scraping

Use this skill when the goal is to extract structured data from web pages, feeds, or HTML documents.

## Python Baseline Gate

Before planning or editing a Python scraper, read the sibling [`../python-development/SKILL.md`](../python-development/SKILL.md), even when the runtime omitted it from the initial Skill list. Keep this skill responsible for fetch, parse, pagination, normalization, retry, deduplication, and crawl behavior; keep `python-development` responsible for Python modules, typing, errors, resource lifetime, package boundaries, and general implementation.

## When To Use

- Collect data from article listings, directories, product pages, or feeds
- Build scrapers or crawlers with pagination and deduplication
- Parse HTML into structured records
- Handle retries, timeouts, headers, sessions, and rate limits
- Work with lightly dynamic sites that still expose usable HTML or JSON

## Boundaries

- Use `browser-automation` or `playwright-automation` for browser-driven data retrieval when authorized clicks, login state, or JS rendering are necessary; choose the available transport that fits the extraction task. Use `webapp-testing` only when the requested outcome is local application verification or UI debugging.
- Use `python-data-engineering` for downstream cleaning, joins, aggregation, or dataset pipelines.
- Use `python-development` for general Python architecture, packaging, or code style.

## Workflow

1. Check for an API, feed, or export before scraping HTML.
2. Inspect the page source and identify stable data locations.
3. Use a session, explicit timeout, and a small retry policy.
4. Extract the smallest stable payload possible.
5. Normalize URLs, whitespace, dates, and missing values.
6. Deduplicate by canonical ID or stable URL.
7. Save reproducible outputs and document scrape assumptions.

## Extraction Rules

- Prefer semantic selectors over brittle full-path CSS chains.
- Use `lxml` or XPath when selectors must be precise.
- Use BeautifulSoup when simple HTML parsing is enough.
- Resolve relative links with `urljoin`.
- Keep parsing pure and separate from fetching.

## Politeness and Safety

- Respect site terms, auth boundaries, and rate limits.
- Do not bypass access controls, captchas, or paywalls.
- Use conservative concurrency.
- Back off on `429`, `403`, and transient network errors.
- Cache fetches when repeated requests are expected.

## Handoff

- For tabular output, hand off to `python-data-engineering`.
- For browser-driven extraction, hand off to `browser-automation` or `playwright-automation`; this changes the extraction transport rather than requiring a QA Skill for every scraper.
- For local application verification, hand off to `webapp-testing`.
- For general Python packaging or style, hand off to `python-development`.

- See [reference/scraping-workflows.md](reference/scraping-workflows.md) for deeper guidance.
