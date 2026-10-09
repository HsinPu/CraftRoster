---
name: workspace-google-ops
description: Google Workspace workflow for Gmail, Calendar, Drive, Contacts, Sheets, and Docs via CLI. Use when an email, calendar, drive, contact, sheet, or document task needs command-line automation.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Workspace Google Ops

Use this skill when the task needs Google Workspace automation from the terminal.

## When To Use

- Search, send, draft, or reply to Gmail messages
- Create or update Calendar events
- Read, search, or move Drive files
- List contacts
- Read or update Sheets and Docs via CLI

## Workflow

1. Identify an existing Google Workspace CLI and inspect its version, help, supported apps, authentication state, and available account scopes through documented read-only commands. This package does not bundle a CLI or grant Google access.
2. Identify the Workspace app and verify that the discovered CLI supports the requested operation and output format. Derive command syntax from its actual help or documentation; do not invent a generic Workspace command.
3. If the CLI, required app support, authentication, or scope is missing, report that runtime prerequisite and provide a bounded plan. Installation, account setup, authentication, and scope expansion require explicit authorization and are separate from using this Skill.
4. Use the narrowest documented command within the authorized account and scope; prefer non-interactive input for repeatable automation when supported.
5. Verify the resulting object, revision, or action receipt. If the task is just document formatting, hand off to `word-document-ops` or `spreadsheet-ops`; if the target is Markdown, hand off to `document-to-markdown`.

## Rules

- Keep mail and calendar actions explicit.
- Treat Drive content and contacts as sensitive data.
- Use JSON payloads or stdin when the CLI supports them.

## Quality Gate

- The right Workspace app was used.
- Auth and scope are clear.
- The result is actionable and auditable.

## Handoff

- For document formatting, use `word-document-ops`.
- For Google Docs export or content conversion to Markdown, use `document-to-markdown`.
- For spreadsheet editing, use `spreadsheet-ops`.
