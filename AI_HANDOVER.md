# AI Handover

## Current Task

Show the Viewport width and height as number spinner fields (`400 ⬍ × 512 ⬍`), per the user's screenshot (state: Awaiting User Approval once pushed). The device size dropdown task before it is also still Awaiting User Approval.

## Latest Session (2026-11-17, eighth request)

- User request: on the branch that is not `main`, make the viewport display values look like the supplied screenshot (`400 ⬍ × 512 ⬍`). `feature/ai-development-workflow` is the only non-main branch.
- Done in `renderer/index.html`: `#vw` and `#vh` are `type="number"` with min/max/step; the "W" and "H" spans are removed.
- Done in `renderer/styles.css`: `.dim input` is 60px wide, right-aligned; the spinner arrows are always visible (`::-webkit-inner-spin-button` opacity 1).
- Not changed: `renderer/app.js` (existing `input` / `change` / Enter handlers and limits still apply).
- Tests: `node test/e2e.js` gives 144 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`). Verified the footer in a browser screenshot.
- Not run: real Electron window testing and `test/main-smoke.js`. The user must test it.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-16 and 2026-11-17, seventh request)


- User request: change the Mobile / Tablet / Desktop tabs into a viewport dropdown like Chrome's device toolbar (screenshot supplied): groups for mobile, tablet and desktop with the dimensions of each device, and the dimensions must be editable.
- Done in `renderer/index.html`: `#devs` is now a `.menu.devm` holding `#devBtn` and `#devDrop`; new `#devEdit` dialog.
- Done in `renderer/styles.css`: `.devm`, `.devdrop`, editor styles; `#modal` rules also apply to `#devEdit`.
- Done in `renderer/app.js`: `DEVICES` (stored in localStorage key `nexusstudio.devices.v1`, cleaned by `cleanDevices()`), `defaultDevices()`, `renderDevMenu()`, `renderDevButton()`, `openDevEdit()`, `renderDevList()`. `setDevice()` now updates the dropdown label and allows the wider limits (120 to 10000). The menu uses the existing `data-menu` / `.drop` mechanism.
- Done in `main/tools.js`: `set_viewport` width description now says 120 to 10000.
- Done in `test/e2e.js`: new "Device size dropdown" checks.
- Device sizes are estimates and editable. Groups are fixed (Mobile, Foldables, Tablets, Desktops, Smart Displays); devices inside them can be added, renamed, resized and removed.
- Tests: `npm test` gives 144 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`).
- Not run: real Electron window testing. The user must test it.
- Merge note: another tool (Dyad) had pushed 2 commits to this branch (live width/height typing, frame-edge drag handles, `server.js`, `dev` script, limits 120 to 10000 wide / 120 to 20000 high). My commit was rebased on top without force-push; the dropdown label now follows typing and dragging, and the limits are Dyad's (not 280 to 3840).
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-14, sixth request, approved)

- User said "Rejected. The margin used to have its individual field for top, right, bottom and left. They are no longer there."
- Finding: no earlier version on the branch had per-side margin fields (only the single "Margin (T R B L)" shorthand); the per-side boxes that exist are the Inset coordinates. Added per-side fields for margin and padding anyway.
- Done in `renderer/app.js`: `sidesBlock()`, `writeSide()`, `refreshSides()`, `splitVals()`, `expand4()`, `sideVals()`; `['SIDES','margin']` and `['SIDES','padding']` rows in the Box Model section; the 8 side properties are registered in `KNOWN` so search jumps to them; the margin/padding shorthand fields drop stray longhands and refresh the side fields.
- Done in `test/e2e.js`: "Margin and padding have a field for each side" checks.
- Tests: `npm test` gives 126 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`).
- Not run: real Electron window testing. The user must test it.
- Result: approved by the user.

## Earlier Session (2026-11-14, fifth request, rejected)

- User request: audit the CSS tab against all CSS (answered: it did not cover all of it), then "fill up the gap wherever necessary without disrupting the UI".
- Done in `renderer/app.js`: `CSSLIST` (property search) now has 600 names taken from the browser (587 standard plus 13 common `-webkit-` ones). Search puts names that start with the typed text first. Enter accepts CSS variables and vendor names. Drop-down option lists for display, float, clear, visibility, overflow, font-family, font-weight, font-style, text-transform, text-decoration, white-space, text-wrap, justify-content, align-items, align-self, grid-auto-flow, background-repeat, mix-blend-mode and cursor were extended (old options keep their order). New `VALS` table and `valList()` give text fields native autocomplete of common values (about 300 properties; others get the global keywords). `text-align` has a fourth button, justify.
- Done in `test/e2e.js`: new "CSS tab covers the full set of CSS" checks.
- Not done: dedicated panel fields for the newly searchable longhands (they show under "Custom properties"); value lists are suggestions, not validation; properties newer than the sandbox browser (Chromium 153) are not suggested.
- Tests: `npm test` gives 118 passed, 3 failed. The 3 failures (`get_window_state`, `get_app_state`, `get_process_info`) also failed before these changes. Not investigated.
- Not run: real Electron window testing. The user must test it.
- Result: rejected by the user because per-side margin fields were missing; see the sixth request above.

## Earlier Session (2026-11-14, fourth request)

- User request: confirm whether the CSS tab contains all CSS. Read-only audit; findings recorded in `TEST_RESULTS.md`.

## Earlier Session (2026-11-14, third request)

- Show each element's browser-default styles on the canvas and in the CSS tab. Done and approved. Details: `UA` table and `applyUA()` in `renderer/app.js`; starter styling that sets the same property wins over the default.

## Earlier Session (2026-11-14, second request)

- User request: add all missing elements, each under the category it fits, creating new categories where needed. Approved by the user.
- Done: the Elements tab offers 98 elements in 12 groups (was 25 in 7). New groups: Text Formatting, Quotes & Code, Inline Details, Form Extras, Table Parts. `svg` graphic added under Media. `VOID` and `CONT` extended.
- Deliberately not added: elements the editor blocks for security (script, style, iframe, frame, frameset, object, embed, link, meta, base, head, html, body, title, noscript, template, slot, portal), obsolete elements, MathML.

## Earlier Session (2026-11-14, first request)

- User request: confirm whether the Elements tab contains all HTML elements, and remove SVG/DRAWING from it.
- Done: removed the `SVG / Drawing` entry from `PAL` in `renderer/app.js`. Approved by the user.
- Audit result at that time: the tab offered 25 HTML elements and many common ones were missing.
- Tests then: 102 passed, 3 failed, identical to before the change.

## Previous Task

Fix window sizing to fit screen and center the app.

## Branch

`feature/ai-development-workflow`

## Work Session Status

Window sizing fix is complete and approved by the user. All changes are on the feature branch.

## User's Original Request

The app dimension extends beyond the screen that the user cannot see the taskbar or the minimize/cancel button. Make the app responsive to whatever screen it is opened in.

## Completed

- Created the dedicated feature branch.
- Confirmed the working tree was clean before Phase 2.
- Established the project workflow requirements.
- Created the persistent AI workflow instructions in `AGENTS.md`.
- **Phase 3:** Documented development mode in `DEVELOPMENT.md` — how to run NexusStudio from source, run tests, and debug.
- **Phase 4:** Added live application inspection capabilities:
  - `get_computed_style` — returns computed CSS styles for an element
  - `get_accessibility` — returns accessibility info (role, name, state, ARIA)
  - `get_console_logs` — returns recent console messages from the editor
  - `inspect_element` — comprehensive element inspection (DOM, styles, accessibility, layout, interactive state)
  - Console log capture added to renderer
- **Phase 5:** Added desktop/MCP testing tools:
  - `get_window_state` — window bounds, focus, visibility, maximized/minimized state
  - `get_app_state` — Electron version, platform, memory, uptime, AI server status
  - `get_process_info` — process ID, memory usage, CPU usage, uptime
  - All desktop tools are read-only and preserve security boundaries
- **Window Sizing Fix:** Made the app responsive to any screen size:
  - Added `screen` import from Electron
  - Get primary display work area size
  - Calculate window size that fits within screen (95% of work area)
  - Center the window on screen
  - Ensure minimum size constraints are respected

## Files Changed

- `AGENTS.md` — updated with new workflow rules (push requirement, state distinctions, feature request process)
- `AI_HANDOVER.md` — updated with current status
- `TASK_CHECKLIST.md` — updated with Phase 3-5 completion
- `TEST_RESULTS.md` — updated with test results
- `DEVELOPMENT.md` — new file, development workflow documentation
- `README.md` — added link to DEVELOPMENT.md
- `main/tools.js` — added 7 new inspection tools
- `main/mcp-server.js` — added desktop tool handlers
- `main/main.js` — added desktop tool implementations + window sizing fix
- `renderer/app.js` — added inspection API functions and console log capture; Elements tab palette changes (SVG / Drawing removed, 73 elements added)
- `test/e2e.js` — new Elements tab checks

## Tests

### Main Process Smoke Tests
```bash
node test/main-smoke.js
```
Result: 20 passed, 0 failed

### End-to-End Editor Tests
```bash
npm test
```
Result: 98 passed, 0 failed

### Total
118 passed, 0 failed

## Git Status

- Branch: `feature/ai-development-workflow`
- Latest code commit: see `git log` (the commit titled "Replace viewport buttons with a device size dropdown")
- Changes pushed: Yes
- Working tree: Clean

## Known Issues

- `get_window_state`, `get_app_state` and `get_process_info` fail in `npm test` in the AI sandbox, both before and after the latest changes. Cause not investigated.
- Elements that only make sense inside a parent (li, td, option, source and similar) are added inside the selected element only if it can hold children; otherwise they are added after it. Nothing enforces valid nesting.
- Elements carry more inline CSS than before, so Copy page code is longer.
- Properties added through search (other than the margin and padding sides) show under "Custom properties", not next to related fields.

## Next Action

Wait for the user to test the Viewport number fields and the device size dropdown and say `APPROVE` or `REJECT`. A separate approval is required before merging into `main` or releasing the application.

## Approval Status

Awaiting User Approval (viewport number spinner fields; device size dropdown). Earlier tasks (SVG / Drawing removal, add missing elements, browser-default styles, CSS tab gaps with margin and padding per-side fields, window sizing fix) were approved by the user.

> Note: No approval here authorizes merging into `main` or releasing the application.
