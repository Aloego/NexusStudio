# NexusStudio Task Checklist

## Status Definitions

- `Pending` — not started.
- `In Progress` — currently being worked on.
- `Blocked` — cannot continue because of a known blocker.
- `Awaiting User Approval` — implementation/tests are ready, changes committed and pushed, but the user must personally test and approve.
- `Approved` — explicitly approved by the user (said `APPROVE`).

## Phase 1 — Development Workflow Preparation

- [x] Create `feature/ai-development-workflow`
- [x] Confirm starting working tree is clean
- [x] Review NexusStudio structure and existing tests
- [x] Check for existing AI workflow files
- [x] Protect `main` from unapproved changes
- [x] Document final branch/merge/release procedure

**Status:** Completed

## Phase 2 — Persistent AI Handover and Tracking

- [x] Create `AGENTS.md`
- [x] Create `AI_HANDOVER.md`
- [x] Create `TASK_CHECKLIST.md`
- [x] Create `TEST_RESULTS.md`
- [x] Review all four files
- [x] Commit Phase 2 changes
- [x] Verify recovery workflow

**Status:** Completed

## Phase 3 — Run NexusStudio Without Reinstalling

- [x] Define development launch procedure
- [x] Run the Electron source directly
- [x] Separate development/test data where practical
- [x] Document Windows/WSL development commands

**Status:** Completed

## Phase 4 — Live Application Inspection

- [x] Inspect DOM/tree
- [x] Inspect accessibility information
- [x] Inspect element properties
- [x] Inspect computed styles
- [x] Inspect layout dimensions
- [x] Inspect console/log output
- [x] Inspect interactive states
- [x] Reduce dependence on screenshots

**Status:** Completed

## Phase 5 — Desktop-App MCP Testing Tools

- [x] Define safe desktop inspection tools
- [x] Add app inspection MCP tools
- [x] Add UI interaction tools
- [x] Keep desktop testing tools separate from webpage-editing tools
- [x] Preserve MCP authentication and security boundaries

**Status:** Completed

## Phase 6 — Automated Test and Repair Loop

- [ ] Run tests before changes
- [ ] Apply changes
- [ ] Run automated tests
- [ ] Test actual application behavior
- [ ] Record evidence
- [ ] Repair failures
- [ ] Repeat until ready for user testing

**Status:** Pending

## Phase 7 — User Approval Gate

- [ ] Mark successful implementation `Awaiting User Approval`
- [ ] User personally tests the application
- [ ] Record user feedback
- [ ] Return to `In Progress` if rejected
- [ ] Mark `Approved` only after explicit user approval
- [ ] Obtain separate approval before merge/release

**Status:** Pending

## Window Sizing Fix

- [x] Fix window sizing to fit screen and center the app
- [x] Add `screen` import from Electron
- [x] Calculate window size from primary display work area
- [x] Add `center: true` to BrowserWindow options
- [x] Run tests to verify no regressions
- [x] Commit and push changes to feature branch

**Status:** Approved

## Remove SVG / Drawing group from Elements tab

- [x] Audit Elements tab against the full list of HTML elements (result: not complete, 25 HTML elements offered)
- [x] Remove the `SVG / Drawing` group from the `PAL` palette in `renderer/app.js`
- [x] Syntax check and run automated tests (same 3 failures as before the change; see `TEST_RESULTS.md`)
- [x] Commit and push changes to feature branch
- [x] User personally tests the Elements tab

**Status:** Approved (user said "Approved" on 2026-11-14)

## Add missing HTML elements to Elements tab

- [x] Inspect how the palette, insertion and export code work
- [x] Add the missing elements, each under the category it fits
- [x] Create new categories where none fit: Text Formatting, Quotes & Code, Inline Details, Form Extras, Table Parts
- [x] Add a plain SVG graphic (`svg`) under Media
- [x] Mark the new empty elements (`wbr`, `source`, `track`, `col`, `area`) so they export without a closing tag
- [x] Let the new container elements accept children when something is dropped on them
- [x] Add automated tests for the Elements tab
- [x] Run automated tests and look at the app in a browser
- [x] Commit and push changes to feature branch (commit `2222648`)
- [ ] User personally tests the Elements tab

**Status:** Awaiting User Approval

## Phase 8 — End-to-End Workflow Verification

- [ ] Test the complete AI workflow
- [ ] Test handover to another AI agent
- [ ] Test recovery from a saved checkpoint
- [ ] Test failed-test workflow
- [ ] Test rejected-user-review workflow
- [ ] Verify merge/release safeguards
- [ ] Document remaining limitations

**Status:** Pending