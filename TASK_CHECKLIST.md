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

**Status:** Approved (user said "Approved" on 2026-11-21)

## Exported files named after the pages

- [x] Exported html/css/js files are named after the page name instead of index / page-1 (an unrenamed tab uses the name typed at the top)
- [x] Test updated, run (250 passed, 3 failed as before)
- [x] Commit and push
- [x] User personally tests

**Status:** Approved (user said "Approve" on 2026-11-21)

## Phase 8 — End-to-End Workflow Verification

- [x] Test the complete AI workflow — the request, investigate, implement, test, record, commit, push, Awaiting User Approval, APPROVE/REJECT cycle has been followed many times in `git log`; all 21 `Approved` status lines in this file quote the user's approval
- [x] Test handover to another AI agent — a fresh download of the repository (`git clone`) was done and the handover files read; another AI session already continued this work from the handover (commits 0baf7fe to 6053ea0) and recorded your decisions correctly
- [x] Test recovery from a saved checkpoint — fresh clone of the feature branch: 250 passed, 3 failed; older checkpoint 6d0e960: 213 passed, 3 failed (same 3 as always)
- [x] Test failed-test workflow — in a throwaway copy a deliberate break made the tests stop with exit code 2 and show failures; the real project was not touched
- [x] Test rejected-user-review workflow — rejections are recorded with reasons (lines for folder-first saving, rails, folder window); found a rule mismatch (rules said "move back to In Progress", records say `Rejected`); fixed in AGENTS.md
- [x] Verify merge/release safeguards — `main` is still the initial commit and the feature branch is 63+ commits ahead, never merged. FOUND A GAP: GitHub does not protect `main` (the protection check says "Branch not protected"), and the Windows build workflow can be started by pushing a tag starting with `v`. Only the written rules prevent a merge or release.
- [x] Document remaining limitations (see below)
- [x] New mandatory rule added to AGENTS.md: read the app state first, explain in simple English what was found, the errors and how to fix them, get the user's approval, only then change anything (user request, 2026-11-21)

**Limitations found:**
1. `main` is not protected on GitHub. The user can switch on branch protection in the GitHub repository settings (Settings, Branches, add a rule for `main`, require a pull request). An AI should not do this without the user's approval.
2. A release can be started by pushing a `v...` tag or running the workflow by hand; the rules forbid it but nothing technical stops it.
3. The rules are text. They only work while each AI reads and follows them; nothing in the code enforces the new approval rule.
4. An AI cannot open the real Electron desktop window, so every feature depends on the user testing it.
5. `npm test` also runs `main-smoke`, which crashes in the AI's sandbox, and 3 old tests (get_window_state, get_app_state, get_process_info) still fail.

**Status:** Approved (user said "I approve phase 8 and the new rule" on 2026-11-21)

## Close a tab without deleting the page

**Request:** a page the user "deletes" should stay in the project (they are only making room for other pages).

- [x] `×` closes the tab; the page stays in the project and in the saved file
- [x] "Closed (n)" list next to `+` to reopen a page or delete it for good (asks first)
- [x] No message when closing; the last open tab cannot be closed
- [x] `closed` saved in the project file and the draft; AI tools `list_pages`/`select_page` updated
- [x] Tests added to `test/e2e.js`

**Status:** Approved (user said "I Approve the Close tab without deleting the page and pages tab" on 2026-11-21)

## Pages tab (file explorer for pages)

- [x] New "Pages" tab in the left panel listing every page; click opens or reopens
- [x] Closing a tab leaves the page in the tree (shown as closed)
- [x] Delete from the tree asks first; "Closed (n)" button removed
- [x] Tests in `test/e2e.js`

**Status:** Approved (user approved with the Close tab task on 2026-11-21)

## Drag to reorder pages

- [x] Drag a row in the Pages tab to a new place; a line shows the drop spot
- [x] Tabs follow the order; the open page stays open; Alt+Up/Down moves a focused row
- [x] Tests in `test/e2e.js`

**Status:** Approved on 2026-11-20 (user said "Approve" right after the drag-to-reorder summary).

## Export a page to a folder; nothing added without consent

**Request (2026-11-21):** keep the `.nexus` project file (it holds every page, open and closed). Exporting a page writes a folder with the HTML, CSS and JavaScript as separate files. Stop the app adding its own styles or code; the user controls all content, styling and behaviour.

- [x] File > Export page to a folder…: folder name asked in the in-app window; writes `index.html`, `css/index.css`, `js/index.js` (CSS/JS files and their links only when the page has any)
- [x] File > Export all pages…: same folder layout, first page `index`, others named after the page (`page-2.html`, `css/page-2.css`)
- [x] Removed what the app added by itself: base reset rules, Google Fonts link, automatic `nx-N` ids and generated `#nx-N` rules, canvas box-sizing rule, default styles on a new blank page
- [x] Panel styles are written in the CSS file under the id or class the user gave; an element with neither gets a `style` attribute
- [x] The sample page keeps its reset, now as visible text in its own CSS tab
- [x] Main process only writes `*.html`, `css/*.css`, `js/*.js` (names checked); folder name checked
- [x] Tests added and updated (`node test/e2e.js`: 250 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] User personally tests exporting a page and all pages, and checks the files

**Status:** Approved (user said "Approved" on 2026-11-21)

## Folder-first saving (decision recorded 2026-11-21)

**Status:** Rejected (user said "I reject the Folder-first saving" on 2026-11-21). Not changed; nothing is being worked on. Phase 8 to be discussed later. The old plan to replace `.nexus` with plain `.html` files is cancelled (the user keeps `.nexus`; export-to-folder is separate and approved).

## Add iframe, embed, object and math to the Elements tab

**Request (2026-11-21):** "Add them" (after the plan was explained and approved: "Approve the plan").

- [x] New Elements group "Embeds & Math": iframe, embed, object, math (with documentation entries)
- [x] iframe/embed/object are no longer blocked in the document; the editor canvas and the Preview show a labelled box, never the real content; the exported file has the real element
- [x] Kept blocked: script, style, frame, frameset, link, meta, base, head, html, body, title, noscript, template, slot, and `srcdoc`/event handlers; `javascript:` addresses are now dropped from src/data/href-type attributes
- [x] `embed` is treated as an empty element; `math` is real MathML (namespace value 2)
- [x] Tests updated and added (254 passed, 3 failed as before); screenshot checked
- [x] Commit and push changes to feature branch
- [ ] User personally tests adding the four elements, the boxes, Preview and export

**Status:** Approved (user said "Approve" on 2026-11-21)

## CSS panel shows only fields that apply to the selected element

**Request (2026-11-21):** "i don't want all styling properties displayed except the ones applicable to a selected element ... only styles applicable to body".  Plan explained first and approved ("Approve the plan (Recommended)").

- [x] Read the panel code and explained the findings and plan before changing anything
- [x] Fields now show only when they apply (`appliesTo` in `renderer/app.js`): body hides float, clear, z-index, offsets, flex/grid item fields; flex item fields only inside a flex or grid parent; text fields hidden for images, hr, media; container (flex/grid) fields hidden for elements that cannot hold children
- [x] New sections that show only where they apply: Lists (ul, ol, li, menu), Image & Media (img, video, canvas, embeds), Table (table parts)
- [x] A field the user already set always stays visible; the Search box still adds any property
- [x] Tests added (261 passed, 3 failed as before); screenshot-style check of the body fields done
- [x] Commit and push changes to feature branch
- [ ] User personally tests the CSS panel on body, a box, a list, an image and a table

**Status:** Approved (user said "Approve" on 2026-11-21)

## CSS panel spacing: one field per line

**Request (2026-11-21):** the CSS section is too crammed; more vertical space and put each style on its own line instead of two columns. Plan explained first and approved; top/right/bottom/left groups stay in one row of four (user's choice).

- [x] Read the panel layout code and explained the plan before changing anything
- [x] `renderer/styles.css` only: one field per line, bigger gaps (16px), more padding inside sections, taller inputs, more space under labels; 4-box groups unchanged in one row
- [x] Tests run (261 passed, 3 failed as before); screenshot checked
- [x] Commit and push changes to feature branch
- [ ] User personally checks the CSS panel

**Status:** Approved (user said "Approve" on 2026-11-21)

## Space control: drag to change margin and padding (step 1 of 2)

**Request (2026-11-21):** a way to add margin and padding by clicking or hovering a button and dragging left or right, like Webstudio; ideally the CSS tab laid out like Webstudio's. Plan explained and approved: step 1 now (Space control, old text boxes removed); step 2 (Webstudio-style rows with label left, value right and a dot when set) later, after the user tries step 1.

- [x] Read the current margin/padding code and explained findings and plan before changing anything
- [x] Space control in `renderer/app.js`: eight number buttons (margin outside, padding inside); drag left/right to change; click to type any value (2rem, auto, 10%); Shift = steps of 10; Alt = all four sides; arrow keys; padding cannot go below 0; one drag = one undo step
- [x] Hovering a number highlights that margin/padding area on the canvas
- [x] Old margin/padding text boxes and the read-only diagram removed; saved values and exported CSS unchanged
- [x] Tests rewritten and added (269 passed, 3 failed as before); screenshot checked
- [x] Commit and push changes to feature branch
- [ ] User personally tests dragging, clicking, Shift/Alt and the canvas highlight
- [ ] Step 2 (Webstudio-style panel rows): not started; to be explained and approved separately

**Status:** Rejected (user said "Rejected" on 2026-11-22: hovering a number should show a two-arrow left/right cursor for dragging, and clicking should open an option to type the value and also change the unit, like Webstudio). Waiting for the user to approve a plan for the fix.

## Space control fix: click popup with value and unit (after rejection)

**Request (2026-11-22):** after rejecting step 1: hovering a number shows a two-arrow cursor for dragging; clicking opens a popup to type the value and change the unit like Webstudio (screenshots supplied). Plan (and its adjustment after the screenshots) explained and approved.

- [x] Click popup: blue side-name chip (e.g. "Margin Top"), value box, unit label (PX) that opens a tick-marked list: px, %, em, rem, vw, vh, svw, svh, lvw, lvh, dvw, dvh, ch; `auto` and other words are typed in the value box; typing `5vh` sets number and unit
- [x] Live apply while typing; Enter or click outside applies; Escape puts the old value back; Up/Down arrows change the number (Shift = 10); padding cannot go below 0
- [x] Two-arrow cursor on hover and kept during a drag; small arrows fade in on hover
- [x] Drag, Shift, Alt, keyboard arrows, canvas highlight unchanged
- [x] Tests updated and added (283 passed, 3 failed as before); screenshot checked against the Webstudio screenshot
- [x] Commit and push changes to feature branch
- [ ] User personally tests dragging and the click popup
- [ ] Step 2 (Webstudio-style rows for the rest of the CSS panel: label above a rounded value box with its unit, highlighted label when set): not started; to be explained and approved separately

**Status:** Approved (user said "Approved." on 2026-11-22 for the Space control popup, the Space/Size split, the removed middle text and the first Space box design)

## Separate Space and Size sections

**Request (2026-11-22):** "separate spacing and the box model". Plan explained first and approved.

- [x] "Box Model & Spacing" split into **Space** (margin and padding control) and **Size** (width, height, min/max, box-sizing, overflow); Space first
- [x] Adding margin/padding from the Search box opens Space; saved values and exported CSS unchanged
- [x] Tests added (285 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] User personally checks the two sections

**Status:** Approved (user said "Approved." on 2026-11-22 for the Space control popup, the Space/Size split, the removed middle text and the first Space box design)

## Remove the width × height text from the Space box

**Request (2026-11-22):** remove the page dimension from the middle; only margin and padding. Plan explained first and approved.

- [x] The size text is gone from the middle; an empty inner box remains
- [x] Test added (286 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] User personally checks the Space box

**Status:** Approved (user said "Approved." on 2026-11-22 for the Space control popup, the Space/Size split, the removed middle text and the first Space box design)

## Space box visual design (first version)

**Request (2026-11-22):** make the margin and padding area look more appealing (no black hole, not ugly). A preview picture (mock.png) was shown first. The user answered: "for now, I will go with the AFTER, though still not what i want."

- [x] Built the "after" design in `renderer/styles.css`: soft warm margin ring and cool blue padding ring with gradients and hairline edges, nested rounded corners, inset textured centre block instead of the black hole, numbers without dark boxes (soft highlight on hover/drag), small spaced labels
- [x] Behaviour unchanged (drag, popup, Shift, Alt, canvas highlight); tests: 286 passed, 3 failed as before; screenshot checked
- [x] Commit and push changes to feature branch
- [ ] User tells what is still not right (they said it is "still not what i want"); a second design pass needs their direction

**Status:** Approved (user said "Approved." on 2026-11-22 for the Space control popup, the Space/Size split, the removed middle text and the first Space box design)

## Narrower panels for one open tab, wider for the whole panel, drag to resize

**Request (2026-11-22):** the CSS tab is too wide; reduce the width when an individual tab is opened and let it grow as more tabs are opened. Plan explained first; the user approved it together with drag handles ("Approve, plus drag handles to resize").

- [x] One tab opened from the strip: right panel 260px, left panel 200px. Whole panel opened with the arrow: right 320px, left 240px (as before)
- [x] Drag handle on each panel's inner edge (col-resize cursor, highlight on hover); minimum 250px (right) and 180px (left); width remembered separately for the one-tab and whole-panel cases; double-click resets
- [x] Tests updated and added (293 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally checks the widths and the drag handles

**Status:** Approved by user (2026-11-22)

## Right panel same width as left panel

**Request (2026-11-22):** the left panel width is liked, but the right is still too wide. Plan explained and approved.

- [x] Right panel now 240px (whole panel) / 200px (one tab), same as the left
- [x] Right panel smallest drag width lowered from 250px to 180px
- [x] Tests updated (293 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally checks the width

**Status:** Approved by user (2026-11-22)

## Tab strips always visible

**Request (2026-11-22):** keep the vertical tabs visible so more tabs can always be opened. Plan explained; user chose the simpler option (clicking a strip tab switches to it) over stacked tabs, and +30px for the strip.

- [x] 30px tab strip stays on the outer edge of both side panels, also while a panel is open
- [x] The open tab is highlighted on the strip; clicking another strip tab switches to it
- [x] Panel inner widths unchanged (240 / 200); the strip adds 30px; arrow and collapse still work
- [x] Tests added/updated (296 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally checks the strips

**Note:** at 200px the Space box in the right panel is slightly cut off on its right side. Not changed; needs a decision.

**Status:** Approved by user (2026-11-22)

## Arrow reopens the last used tab; Space box fits 200px

**Request (2026-11-22):** the arrow should no longer open all tabs but the last active tab. Plan explained and approved (top row of tab buttons removed, strip does the switching). While testing, the Space box was found too wide for 200px; user approved shrinking it.

- [x] An open panel always shows one tab (the last used); the strip arrow reopens that tab at 200px
- [x] The top row now shows only the open tab's name and the hide arrow
- [x] Space box made smaller so margin and padding boxes fit and can be dragged at 200px
- [x] Tests updated (296 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally checks the arrows and the Space box

**Status:** Approved by user (2026-11-22)

## Variables tab (design tokens) — Step 1

**Request (2026-11-23):** a visual way to set CSS variables, like Penpot tokens. Plan explained; user approved Step 1 and chose the name "Variables".

- [x] New Variables tab on the right strip: add, rename, change type (Colour / Size), edit value (colour picker for colours), delete
- [x] Names are cleaned (lowercase letters, numbers, dashes, unique); values are checked so nothing unsafe can be written
- [x] Written once as `:root { --name: value; }` at the top of the page CSS and the exported css file, only when at least one variable exists
- [x] Saved with the project (.nexus file and autosave); also listed in the MCP get_document result
- [x] Tests added (306 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] User personally tries the Variables tab
- [ ] Step 2 (apply a variable from a field in the CSS panel) — NOT started, needs a separate plan and approval

**Status:** Approved by user (2026-11-23)

## Variables Step 2 (colour fields) and specific size types

**Request (2026-11-23):** "Size" is too generic; variables should appear in every element colour picker so they can be chosen as the colour. The user approved Step 1 on that condition and approved this plan.

- [x] Variable types are now Colour, Spacing, Font size, Corner radius, Width / height, Border thickness (old "Size" variables become Spacing); new variables get a matching name (spacing-1, radius-1 ...)
- [x] Every colour field in the CSS panel (text colour, background colour) has a small ◆ button listing the colour variables; choosing one shows a chip with its name and writes `var(--name)`
- [x] Editing a variable updates every place using it, on the canvas as well; ✕ on the chip detaches (keeps the current colour); a deleted variable shows as missing
- [x] Variables also work on the canvas (set on the page so they can never clash with the editor's colours)
- [x] Tests added (315 passed, 3 failed as before); a bug the tests found (chooser closing itself on second use) was fixed
- [x] Commit and push changes to feature branch
- [x] User personally tries it
- [ ] Choosing size variables in size fields (spacing, font size ...) — NOT started, needs a separate plan and approval

**Status:** Approved by user (2026-11-23) (this also completes approval of Variables Step 1, as the user conditioned)

## Variables grouped like Penpot Assets; name / value / unit rows

**Request (2026-11-23):** group variables into categories instead of one long list; apart from colours, each variable row should be name, value and a unit dropdown. Plan explained; user approved with vw and vh added for Width / height. (The previous Variables Step 2 was approved in the same message.)

- [x] Variables tab is split into collapsible groups: Colours, Typography (Font size), Sizes (Spacing, Corner radius, Width / height, Border thickness), each with a count and its own + Add button
- [x] Colour rows: name, swatch, value. Every other row: name, number, unit dropdown (px, rem, em, %; Width / height also vw, vh); CSS written as number + unit (e.g. --gap: 1.5rem;)
- [x] Old values carry over (16px shows as 16 + px); bad numbers refused
- [x] Tests rewritten and added (321 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally tries it
- [ ] Choosing size variables in size fields — NOT started, needs a separate plan and approval

**Status:** Approved by user (2026-11-23)

## Variables: full Typography group

**Request (2026-11-23):** Typography only had Font size; font name / family and the rest were missing. Plan explained and approved ("Approve all five").

- [x] Typography now has Font family (name + fallbacks, with a "+ fallback" dropdown), Font size, Font weight (100–900 dropdown), Line height (number + unit or none), Letter spacing (number + px / rem / em, negatives allowed)
- [x] Font names are limited to letters, numbers, spaces, commas, quotes and dashes (nothing unsafe is written)
- [x] Tests added (330 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [x] User personally tries it
- [ ] Choosing variables inside the CSS panel's size and text fields — NOT started, needs a separate plan and approval

**Status:** Approved by user (2026-11-23)

## Font family variables: ready-made font lists and Google Fonts link (with consent)

**Request (2026-11-23):** font family should already be populated with Google fonts and system fonts, as dropdowns: family type, fonts under it, and fallbacks from the same family. User approved, including the Google link button in this step.

- [x] Font family row = three dropdowns: family type (Sans-serif, Serif, Monospace, Display, Handwriting, Custom), Font (about 70 ready-made: "On your computer" and "Google fonts"), and fallbacks from the same family (add several, remove with ✕)
- [x] Choosing a Google font shows a notice and an "Add Google Fonts link" button; the link is added to exported pages ONLY after you click, and only while a variable uses that font; "Remove link" undoes it; approval is saved in the project
- [x] "Custom" lets you type a font name (letters, numbers, spaces only)
- [x] Nothing else changed in the app security rules: the in-app Preview stays offline (it shows fallback fonts); the link only works in exported pages
- [x] Tests rewritten (341 passed, 3 failed as before); Google link itself not loaded from the real network in tests
- [x] Commit and push changes to feature branch
- [ ] User personally tries it (and opens an exported page online to see a Google font)

**Status:** Awaiting User Approval

## Variable choosers in every field — Part 1 of 3: border and outline colour

**Request (2026-11-23):** plan approved ("all three parts"): Part 1 more colour fields, Part 2 size and text fields, Part 3 margin and padding popup.

- [x] Part 1: new Border color and Outline color fields (swatch, text, ◆ variable chooser) in Border & Outline; the shorthand fields are unchanged
- [x] Tests added (343 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] Part 2 (size and text fields) — in progress
- [ ] Part 3 (margin and padding popup) — not started

**Status:** In progress (Awaiting User Approval after Part 3)

## Variable choosers — Part 2 of 3: size and text fields

- [x] Width, height, min/max, gap, border radius, font size, font weight, font family, line height and letter spacing each get a ◆ button listing only the matching variable type; a chip shows the name and value; ✕ detaches (keeps the real value); a deleted variable shows as missing
- [x] Tests added (363 passed, 3 failed as before)
- [x] Commit and push changes to feature branch
- [ ] Part 3 (margin and padding popup) — in progress

**Status:** In progress (Awaiting User Approval after Part 3)
