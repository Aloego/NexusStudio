# NexusStudio AI Agent Instructions

## Purpose

NexusStudio is an Electron desktop application with HTML/CSS/JS and MCP integration.

These instructions apply to every AI agent working on this repository.

## Core Workflow Rules

1. Work on a dedicated feature/task branch.
2. Do not make unrequested changes.
3. Inspect the existing implementation before changing it.
4. Keep changes small and focused.
5. Run the appropriate tests after making changes.
6. Record important work, test results, errors, and remaining work in the project tracking files.
7. Commit meaningful checkpoints so another agent can recover the work.

## User Approval Gate

Passing automated tests does NOT mean a task is complete.

The required workflow is:

Pending
→ In Progress
→ Awaiting User Approval
→ Approved

Only the user can move work from `Awaiting User Approval` to `Approved`.

An AI agent must NOT:

- mark a task Approved without explicit user approval;
- merge a feature branch into `main`;
- release or publish a build;
- claim that the user has personally tested the change.

If the automated tests pass, leave the task at:

`Awaiting User Approval`

The user must personally test the application and explicitly approve the change.

If the user rejects the change, move the task back to:

`In Progress`

and record the reason.

## Git Rules

- Never work directly on `main` for feature implementation.
- Create or use the appropriate feature branch.
- Make regular commits at useful checkpoints.
- Do not merge into `main` without explicit user approval.
- Do not rewrite history or force-push unless explicitly requested.
- Before making major changes, inspect `git status` and the current branch.
- Before claiming completion, inspect `git diff` and `git status`.

## Testing Rules

When practical, test at three levels:

1. Static/code-level checks.
2. Automated application tests.
3. Actual application behavior.

Automated tests may be run by an AI agent.

Actual user acceptance testing belongs to the user.

Test results must be recorded in `TEST_RESULTS.md`.

Do not describe a test as successful unless it was actually run and passed.

## Handover Rules

At the end of a work session, update `AI_HANDOVER.md` with:

- current task;
- current branch;
- what was completed;
- files changed;
- tests run;
- test results;
- known problems;
- next action;
- user approval status.

The next AI agent must read `AI_HANDOVER.md` before continuing work.

Do not assume that previous conversation context is available.

## Task Tracking

`TASK_CHECKLIST.md` is the source of truth for task status.

`AI_HANDOVER.md` records the current work session and tells the next agent where to continue.

`TEST_RESULTS.md` records test commands, results, failures, and evidence.

Use these statuses:

- `Pending`
- `In Progress`
- `Blocked`
- `Awaiting User Approval`
- `Approved`

Do not use `Approved` unless the user explicitly approves the work.

## Security

Do not weaken Electron security settings merely to make testing or development easier.

Preserve appropriate:

- context isolation;
- disabled Node integration in renderer processes;
- sandboxing;
- MCP authentication;
- sender/origin validation;
- safe IPC boundaries.

Any intentional security change must be clearly documented and tested.

## MCP Changes

NexusStudio's MCP tools must remain authenticated and properly separated from webpage-editing functionality.

New desktop-app testing tools should not accidentally expose arbitrary system access.

Test MCP changes through the actual MCP interface where practical.

## Recovery

If another agent takes over:

1. Read `AGENTS.md`.
2. Read `AI_HANDOVER.md`.
3. Read `TASK_CHECKLIST.md`.
4. Read `TEST_RESULTS.md`.
5. Run `git status --short --branch`.
6. Inspect the current branch and recent commits.
7. Continue from the recorded `Next Action`.

## Completion Definition

A task is only fully approved when:

- implementation is finished;
- relevant automated tests pass;
- the user personally tests the resulting application;
- the user explicitly approves the change;
- and, if requested, the user separately approves merging/releasing it.

Automated test success alone means:

`Awaiting User Approval`
