---
name: mcp-ops
description: MCP workflow for listing, configuring, authenticating, and calling MCP servers or tools from the terminal. Use when a task needs MCP server discovery, tool invocation, auth setup, or type and CLI generation.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# MCP Ops

Use this skill when the task is about talking to MCP servers directly.

## When To Use

- Discover available MCP servers or tools
- Authenticate, configure, or edit MCP server setup
- Call tools over HTTP or stdio
- Generate CLI wrappers or TypeScript types for MCP workflows

## Workflow

1. List the server or tool first.
2. Confirm auth and configuration.
3. Call the narrowest tool that answers the task.
4. Prefer JSON output for automation and follow-up processing.
5. If the task is actually GitHub API work, use `github-operations` instead.

## Rules

- Keep tool calls explicit and typed.
- Prefer direct tool invocation over ad hoc scripting when possible.
- Capture the server name, tool name, and key arguments in the result.

## Quality Gate

- The server or tool is identified clearly.
- Auth and config are handled before calling tools.
- Output is usable for the next step.

## Handoff

- For GitHub-specific tasks, use `github-operations`.
- For general terminal execution and command evidence, use `terminal-ops`.
- For local Git work, use `git-operations`; for code restructuring, use `code-refactoring`.
