# AI Handover

## Current Task

No task is in progress. The last task, showing each element's browser-default styles on the canvas and in the CSS tab, was approved by the user on 2026-11-14. The user then asked for an audit of the CSS tab against all available CSS (read-only, no code changes; findings are in `TEST_RESULTS.md`).

## Latest Session (2026-11-14, third request)

- User request: all HTML elements should show their default behaviour/characteristics on the canvas and in the CSS tab. Example: a div normally takes the width of its container; show that when it is dragged on, with the values in the CSS tab.
- Done in `renderer/app.js`: new `UA` table (browser-default styles for all 98 palette elements) and `applyUA()`. `make()` now wraps `makeRaw()` and applies the defaults to the new element and its starter children. Starter styling that sets the same property wins over the default. Starters added in the previous task were simplified to show true defaults. `ul`/`ol` starters use the `padding` shorthand so the CSS tab agrees with the canvas. svg starter has explicit 120px width/height (a `width: auto` would override the svg's width attribute).
- Not changed: elements added by `add_html` or by the MCP `add_element` tool without `use_preset`, imported HTML, and the sample page. Only palette adds (and `use_preset`) get the defaults.
- Starters that deliberately differ from the browser default: div, section, header, nav, main, footer, article, aside, details (padding, minimum height, background, flex rows, width), h1, h2, p (zero margins, custom sizes), img, video, audio, a, button, input, textarea, select, form, ul, ol, table, dialog, canvas, svg. Offer to switch these to pure browser defaults if the user wants.
- Done in `test/e2e.js`: new checks in their own browser context ("Elements start with their browser defaults").
- Tests: `npm test` gives 109 passed, 3 failed. The 3 failures (`get_window_state`, `get_app_state`, `get_process_info`) also failed before these changes. Not investigated.
- Not run: real Electron window testing. The user must test it.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

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
- Latest code commit: see `git log` (the commit titled "Show browser-default styles for every element")
- Changes pushed: Yes
- Working tree: Clean after the follow-up commit

## Known Issues

- `get_window_state`, `get_app_state` and `get_process_info` fail in `npm test` in the AI sandbox, both before and after the latest changes. Cause not investigated.
- Elements that only make sense inside a parent (li, td, option, source and similar) are added inside the selected element only if it can hold children; otherwise they are added after it. Nothing enforces valid nesting.
- Elements now carry more inline CSS than before, so Copy page code is longer.

## Next Action

Wait for the user's next instruction. A separate approval is required before merging into `main` or releasing the application.

## Approval Status

Approved (browser-default styles). Earlier tasks (SVG / Drawing removal, add missing elements, window sizing fix) were also approved by the user.

> Note: No approval here authorizes merging into `main` or releasing the application.
