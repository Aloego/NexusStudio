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
- [x] User decided: add drag-to-move for elements that are not static (next task)

**Status:** Completed (investigation only)

## Drag positioned elements on the canvas

- [x] Inspect how the canvas handles the mouse (a press only selected the element)
- [x] Let the user drag an element on the canvas when its position is not static (relative, absolute, fixed, sticky); elements set to static, or static by default, do not move
- [x] Dragging writes `left`/`top` (or `right`/`bottom` when the element already uses those); works at any zoom; the CSS tab fields update; one Undo reverses a whole drag; a plain click still only selects
- [x] Keep Alt+Up / Alt+Down, Layers drag-and-drop and the resize handles as they were
- [x] Add automated tests (10 checks), run all tests, confirm the new move tests fail on the old code
- [x] Commit and push changes to feature branch
- [x] User asked (before approving) for a move cursor and hint over draggable elements: the pointer becomes the move cursor and a small "Drag to move" label follows it over any element that can be dragged; nothing shows over static elements; hidden while pressing/dragging; not saved into the page code (5 new checks)
- [x] User personally tests dragging elements on the canvas and the move cursor / hint

**Status:** Approved (user said "Approved" on 2026-11-17)

## Element documentation from the blue tag on the canvas

- [x] Make the blue element-name tag on the canvas clickable
- [x] Built-in offline guide for all 98 palette elements plus body (`renderer/docs.js`)
- [x] Option to open the MDN page online
- [x] (Rejected 2026-11-17: folder chooser window went beyond the screen; user wants MDN online or the Zeal app.) Replaced with an "Open in Zeal" button that starts the installed Zeal on the element page; no file dialog; a box to type the Zeal path appears only if Zeal is not found
- [x] Add automated tests, run them, look at the dialog in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the tag, the guide, the MDN button and the Zeal button

**Status:** Approved (user said "Approved" on 2026-11-17, after two rejections and fixes)

## W3Schools button in the element documentation dialog

- [x] Add an "Open on W3Schools (online)" button beside the MDN button (`https://www.w3schools.com/tags/tag_<tag>.asp`; svg goes to the SVG intro page); the address is shown with Copy link
- [x] Add automated tests, run them
- [x] Commit and push changes to feature branch
- [x] User personally tests the W3Schools button

**Status:** Approved (user said "Approved" on 2026-11-17)

## Every element draggable on the canvas

- [x] Remove the "static elements do not move" rule: any element (except the page itself) can be dragged
- [x] A static element becomes `position:relative` when dragging starts, then `left`/`top` are written (keeps its place in the flow); positioned elements keep their type
- [x] Move cursor and hint show on every element; click still only selects; one Undo reverses the whole drag
- [x] Update and add automated tests, run them
- [x] Commit and push changes to feature branch
- [x] User personally tests dragging ordinary (static) elements

**Status:** Approved (user said "Approved" on 2026-11-18)

## New elements no longer get trapped inside the previous element

- [x] Investigate why an h1 added after a div could not be moved on its own (it was added inside the div)
- [x] Clicking an element in the Elements tab adds it after the selected element, not inside it; parts that need a parent still nest correctly
- [x] Dropping on a box (canvas or Layers) still puts the element inside
- [x] Add automated tests, run them
- [x] Commit and push changes to feature branch
- [x] User personally tests adding div, h1, p and dragging each on its own

**Status:** Approved (user said "Approved" on 2026-11-18)

## Independent dragging, moving elements in and out of boxes, full HTML document

- [x] Dragging an element on the canvas moves only that element (and what is really inside it)
- [x] Drag an element into a box or out of a box; the box under the pointer is outlined with a hint; Alt only moves; the element does not jump
- [x] "Move out of box" button and Alt+Left shortcut (so an element can leave a box without being deleted)
- [x] Dropping from the Elements tab near a box's top/bottom edge puts the element beside the box, the middle puts it inside
- [x] The HTML tab shows a complete document (doctype, html, head, body)
- [x] Add automated tests, run them
- [x] Commit and push changes to feature branch
- [x] User personally tests dragging, moving in and out, Move out of box and the HTML tab

**Status:** Approved (user said "Approved" on 2026-11-18)

## Collapsible side panels and several pages

- [x] Collapse arrow on the Elements/Layers panel and on the Properties panel; thin strip with an arrow to bring each back; remembered
- [x] Page tabs above the canvas: add, open, rename, duplicate, delete (two clicks)
- [x] Each page has its own elements, CSS, JavaScript and undo history
- [x] Pages saved in the draft and in project files (old files still open)
- [x] File > Export all pages…; MCP page tools
- [x] Add automated tests, run them, look at the app in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests collapsing the panels, adding and switching pages, and Export all pages

**Status:** Approved (user said "Approved but …" on 2026-11-20, with the changes below)

## Page delete message, one-tab rails, smaller save window, folder-first saving

- [x] Deleting a page no longer asks "click again"; an unsaved page shows a message (may lose content) with Save / Discard / Keep page
- [x] Collapsed panels show a button per tab (Elements, Layers; HTML, CSS, JavaScript) that opens only that tab
- [x] Save/Open/Export windows are now inside the app and fit short laptop screens (replaces the tall Windows window)
- [x] Save, Save as and + on a fresh project: pick/create the project folder first, then the file name; existing file warns before replacing
- [x] Main process validates every chooser path (no arbitrary writes); tests updated and added, run
- [x] Commit and push changes to feature branch
- [x] User tested (2026-11-20), part by part:
  - Delete-page message: user said "the delete-page confirmation is gone, good". Not marked Approved (no explicit APPROVE).
  - In-app save window: user said "the in app save window display is fine too". Same.
  - One-tab rails: REJECTED. Clicking a rail tab still brought back all tab buttons (Elements and Layers, or HTML, CSS and JavaScript). The arrow should open everything. Fixed in the next task.
  - Folder-first saving: REJECTED. After saving, the top bar still shows the old name and the fixed `/index.html`; the file name is not reflected on the page. The user chose to leave this for now (2026-11-20); it was not changed.

**Status:** Split on 2026-11-20. In-app save window: Approved (user said "In-app save window - Approve"). One-tab rails: Rejected, fixed in the next task, now Approved. Folder-first saving: Rejected (user said "Folder-first saving - Reject"), reason: after saving, the file name is not reflected on the page (the top-bar name and the fixed `/index.html` do not change); the user asked to leave it for now, so it is still in the code unchanged and is back to In Progress / not started. Delete-page message: REJECTED on 2026-11-20 (user said "Delete page message - Rejected"): it must appear only when the page has been modified; an unmodified page must close with no message. Fixed in the next task. Design notes for the folder-first fix are in `AI_HANDOVER.md`.

## Rails: a rail tab opens only that tab

- [x] Confirm the problem: opened from a rail tab, the panel showed every tab button (reproduced in a browser)
- [x] A rail tab now opens the panel showing only that tab and its button; the arrow on the strip opens the whole panel with every tab
- [x] Left (Elements, Layers) and right (HTML, CSS, JavaScript) panels; narrow-window layout unchanged
- [x] Add automated tests (7 checks); the three single-tab checks fail on the old code
- [x] Run automated tests (same 3 failures as before); look at the result in a browser
- [x] Commit and push changes to feature branch
- [x] User personally tests the rails

**Status:** Approved (user said "Rail task - Approve" on 2026-11-20)

## Delete-page message only for a modified page

- [x] Reproduce: a freshly added, untouched page still showed the message (the old check used one flag for the whole project, set by adding a page, renaming and any edit anywhere)
- [x] Each page now remembers its content as it was when created, opened or last saved; the message appears only if that page differs from it. Untouched, blank, freshly added or duplicated-and-unchanged pages close with no message; editing a different page does not matter; saving clears it
- [x] Keep the message text and its Save / Discard / Keep page buttons as they were
- [x] Add and update automated tests (6 new checks, one old check rewritten), run all tests
- [x] Commit and push changes to feature branch
- [ ] User personally tests deleting pages (untouched and modified)

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

## Close a tab without deleting the page

**Request:** a page the user "deletes" should stay in the project (they are only making room for other pages).

- [x] `×` closes the tab; the page stays in the project and in the saved file
- [x] "Closed (n)" list next to `+` to reopen a page or delete it for good (asks first)
- [x] No message when closing; the last open tab cannot be closed
- [x] `closed` saved in the project file and the draft; AI tools `list_pages`/`select_page` updated
- [x] Tests added to `test/e2e.js`

**Status:** Awaiting User Approval. Replaces the delete-page-message behaviour (that task's own approval is no longer needed).
