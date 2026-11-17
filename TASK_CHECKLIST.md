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
- [x] User personally tests the Elements tab

**Status:** Approved (user said "Approved" on 2026-11-14)

## Show browser-default styles for every element

- [x] Build a table of browser-default styles for all 98 palette elements (display, position, width, height, margin, padding, fonts, text decoration and similar)
- [x] Apply the defaults when an element is added (including its starter children), so they show on the canvas and in the CSS tab
- [x] Starter styling that sets the same property still wins (for example the div's padding and minimum height)
- [x] Simplify the starters added in the previous task so they show true defaults
- [x] Add automated tests (new div fills its container; CSS tab shows each probed element's defaults)
- [x] Run automated tests and look at the app in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the defaults in the CSS tab

**Status:** Approved (user said "Approved" on 2026-11-14)

## Fill the gaps in the CSS tab

- [x] Property search lists every property the browser supports (600 names, was 147)
- [x] Search shows the closest matches first and accepts any name, including CSS variables and vendor properties
- [x] Drop-down fields offer the full set of keyword values (existing options keep their order)
- [x] Text fields suggest common values as you type (any other value can still be typed)
- [x] Add a justify button to text-align
- [x] Add automated tests
- [x] Run automated tests and look at the panel in a browser (layout unchanged)
- [x] Commit and push changes to feature branch
- [x] User rejected on 2026-11-14: "The margin used to have its individual field for top, right, bottom and left. They are no longer there."
- [x] Checked the earlier versions: the Box Model section only ever had one shorthand "Margin (T R B L)" field; the per-side top/right/bottom/left boxes that exist are the Inset coordinates. Added per-side fields for margin and padding (below their shorthand fields, same look as the inset boxes), kept in step with the shorthand field
- [x] Searching margin-top, margin-left and the other sides now jumps to those fields
- [x] Added automated tests, ran them, looked at the panel in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the CSS tab

**Status:** Approved (user said "Approved" on 2026-11-14, after the rejection fix)

## Device size dropdown replaces the Mobile / Tablet / Desktop buttons

- [x] Replace the three buttons beside the Viewport fields with a dropdown (shows "Responsive" or the chosen device's name)
- [x] Dropdown groups: Mobile, Foldables, Tablets, Desktops, Smart Displays; each device shows its width × height
- [x] Choosing a device sets the Viewport width and height; typing your own size switches back to "Responsive"; Rotate keeps the device name
- [x] "Edit…" opens an editor: change any name, width or height, add a device to a group, remove a device, reset to defaults; changes are saved on this computer
- [x] Merged with another tool's (Dyad) pushed commits (live typing in width/height, drag-handles on the frame edges, `server.js`, `dev` script); the old `data-w` button syncing was replaced by updating the dropdown label
- [x] Width/height limits follow the Dyad commits (120 to 10000 wide, 120 to 20000 high) so desktop sizes such as 1920 and 2560 fit; MCP tool text updated
- [x] Add automated tests, run them, look at the app in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the device dropdown

**Status:** Approved (user said "I approve the dropdowns task too" on 2026-11-17)

## Viewport fields as number spinners

- [x] Change the Viewport width and height boxes to number fields with visible up/down arrows, no W/H letters, to match the user's screenshot (`400 ⬍ × 512 ⬍`)
- [x] Keep the existing limits (120 to 10000 wide, 120 to 20000 high), typing, Enter, Rotate and the device dropdown unchanged
- [x] Run automated tests (same 3 failures as before; see `TEST_RESULTS.md`) and look at the footer in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the Viewport fields

**Status:** Approved (user said "Approved" on 2026-11-17)

## Add every element blank

- [x] Confirm which Elements-tab items came with starter content (header "Brand"/"Menu", footer "© Your company", nav, article, aside, details, form, select, lists, tables, dialog, hgroup, search, picture, figure, fieldset, text elements and more)
- [x] `make()` in `renderer/app.js` now returns every element with no starter text and no starter child elements; starter styles and attributes are kept
- [x] Same behaviour for palette click, drag onto the Layers tree, and the MCP `add_element` `use_preset` option (explicit `text` / `children` from an MCP call still apply); `use_preset` tool text updated in `main/tools.js`
- [x] Add automated tests (all 98 elements are added blank; header and footer have nothing inside)
- [x] Run automated tests (same 3 failures as before; see `TEST_RESULTS.md`) and look at the canvas in a browser
- [x] Commit and push changes to feature branch
- [x] User rejected on 2026-11-17: "Reject. i wish to leave the prefilled elements as it is"
- [x] Reverted `renderer/app.js`, `main/tools.js` and `test/e2e.js` to their state before this task (commit `c9739fc`); the prefilled starter content is back. Tests after the revert: 144 passed, 3 failed (same 3 as before)

**Status:** Rejected — reverted; the prefilled elements stay as they were. No further work on this task unless the user asks.

## Check whether canvas elements can be moved (read-only)

- [x] Read the canvas mouse handling in `renderer/app.js` (a press on the canvas only selects; no drag-to-move)
- [x] Test in a browser: mouse-drag a box on the canvas, in normal flow and with `position: absolute` (nothing moved either time)
- [x] Record findings in `TEST_RESULTS.md`; no application code changed
- [ ] User decides whether to add drag-to-move on the canvas

**Status:** Completed (investigation only). Waiting for the user's decision.

## Phase 8 — End-to-End Workflow Verification

- [ ] Test the complete AI workflow
- [ ] Test handover to another AI agent
- [ ] Test recovery from a saved checkpoint
- [ ] Test failed-test workflow
- [ ] Test rejected-user-review workflow
- [ ] Verify merge/release safeguards
- [ ] Document remaining limitations

**Status:** Pending