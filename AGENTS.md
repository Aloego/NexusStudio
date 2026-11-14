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
8. **Push the commit to the appropriate feature branch on the remote repository.** Confirm that the push succeeded and record the branch/commit information in the handover or task tracking documentation. The push is only to make the tested implementation available for the user's local testing — it does not mean the task is approved, merged, or released.

## User Approval Gate

Passing automated tests does NOT mean a task is complete.

The required workflow is:

```
Pending → In Progress → Awaiting User Approval → Approved
```

Only the user can move work from `Awaiting User Approval` to `Approved`.

An AI agent must NOT:

- mark a task Approved without explicit user approval;
- merge a feature branch into `main`;
- release or publish a build;
- claim that the user has personally tested the change;
- interpret automated test success as user approval.

If the automated tests pass, leave the task at:

`Awaiting User Approval`

The user must personally test the application and explicitly approve the change.

If the user rejects the change, move the task back to:

`In Progress`

and record the reason.

## State Distinctions

Use these states correctly:

- **Working** — The AI is actively implementing or investigating.
- **Implementation Ready** — Implementation and automated verification are finished; changes are committed and pushed to the feature branch.
- **Awaiting User Approval** — Changes have been committed and pushed, and the user must manually test the actual application.
- **Approved** — Only the user has explicitly approved the implementation (said `APPROVE`).
- **Rejected** — The user has explicitly rejected the implementation or reported a problem requiring correction.

Do not move the task into `Approved` without explicit user approval.

## Feature Request Process

When the user gives a feature request:

1. Understand the requested behavior independently.
2. Inspect the existing NexusStudio architecture.
3. Determine the appropriate implementation.
4. Make the necessary changes.
5. Update tests where appropriate.
6. Run the relevant automated tests.
7. Inspect the application when practical.
8. Document the implementation and evidence.

Ask the user a question only when an important requirement genuinely cannot be determined safely from the request, existing code, or project documentation.

## Testing Rules

When practical, test at three levels:

1. Static/code-level checks.
2. Automated application tests.
3. Actual application behavior.

Automated tests may be run by an AI agent.

Actual user acceptance testing belongs to the user.

Test results must be recorded in `TEST_RESULTS.md`.

Do not describe a test as successful unless it was actually run and passed.

Clearly distinguish:

- tests that passed;
- tests that failed;
- tests that could not be run;
- manual testing that still needs to be performed by the user.

Automated test success does **not** equal user approval.

## Git Workflow

When the implementation and automated verification are ready for user testing:

1. Commit the changes with an appropriate commit message.
2. **Push the commit to the appropriate feature branch on the remote repository.**
3. Confirm that the push succeeded.
4. Record the relevant commit/branch information in the handover or task tracking documentation.

The push is only to make the tested implementation available for the user's local testing.

**Do not merge the feature branch into `main`.**

**Do not release a build unless the user explicitly instructs you to do so after approval.**

## Handover Rules

At the end of a work session, update `AI_HANDOVER.md` with:

- user's original request;
- current task/state;
- implementation completed;
- files changed;
- tests performed and results;
- current Git branch;
- latest commit;
- whether changes were pushed;
- remaining work;
- known problems;
- user's approval/rejection status;
- exact next action.

The next AI agent must read `AI_HANDOVER.md` before continuing work.

Do not assume that previous conversation context is available.

If the AI session runs out of credits, reaches a limit, or is interrupted before completion, leave the project in the safest recoverable state possible and update the handover before stopping whenever technically possible.

A new agent/session must read the handover and workflow files before continuing.

Running out of credits must **not** be interpreted as approval or completion.

## Task Tracking

`TASK_CHECKLIST.md` is the source of truth for task status.

`AI_HANDOVER.md` records the current work session and tells the next agent where to continue.

`TEST_RESULTS.md` records test commands, results, failures, and evidence.

Use these statuses:

- `Pending` — not started.
- `In Progress` — currently being worked on.
- `Blocked` — cannot continue because of a known blocker.
- `Awaiting User Approval` — implementation/tests are ready, but the user must personally test and approve.
- `Approved` — explicitly approved by the user.

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

Never assume that a previous AI session finished successfully merely because changes exist in the repository.

## Completion Definition

A task is only fully approved when:

- implementation is finished;
- relevant automated tests pass;
- the user personally tests the resulting application;
- the user explicitly approves the change;
- and, if requested, the user separately approves merging/releasing it.

Automated test success alone means:

`Awaiting User Approval`

## Normal Future Workflow

For every feature request, follow this cycle:

```
User describes feature
   ↓
AI investigates and implements
   ↓
AI runs automated tests
   ↓
AI documents evidence
   ↓
AI commits changes
   ↓
AI pushes feature branch
   ↓
AI reports `Awaiting User Approval`
   ↓
User pulls the changes
   ↓
User manually tests NexusStudio
   ↓
User says `APPROVE` or `REJECT`
   ↓
If approved: wait for the user's next instruction regarding merge/release.
If rejected: fix → test → commit → push → `Awaiting User Approval` again.
```

This workflow is now the expected development process for NexusStudio.