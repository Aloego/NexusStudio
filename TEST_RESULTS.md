# NexusStudio Test Results

## Phase 2

### Date

2026-11-05

### Branch

feature/ai-development-workflow

### Scope

Creation of persistent AI workflow and handover tracking files.

### Pre-change Check

Command:

git status --short --branch

Result:

## feature/ai-development-workflow

Working tree was clean before the Phase 2 changes.

### Automated Application Tests

Not run yet.

Reason: Phase 2 creates workflow documentation/tracking files and does not modify application runtime code.

### Files Added

- AGENTS.md
- AI_HANDOVER.md
- TASK_CHECKLIST.md
- TEST_RESULTS.md

### Current Result

Phase 2 workflow files were reviewed and the recovery workflow was verified.

### Approval

Awaiting User Approval

Automated checks and file review do not constitute user approval.

The user must personally review/test the work and explicitly approve it before it can be considered approved or merged.

### Next Test/Verification

User must personally review/test the completed Phase 2 workflow and explicitly approve it.

---

## Phase 3-5

### Date

2026-11-13

### Branch

feature/ai-development-workflow

### Scope

Development mode documentation, live application inspection capabilities, and desktop/MCP testing tools.

### Pre-change Check

Command:

git status --short --branch

Result:

## feature/ai-development-workflow

Working tree was clean before the Phase 3-5 changes.

### Automated Application Tests

#### Main Process Smoke Tests

Command:

node test/main-smoke.js

Result:

20 passed, 0 failed

#### End-to-End Editor Tests

Command:

npm test

Result:

98 passed, 0 failed

#### Total

118 passed, 0 failed

### Files Changed

- `DEVELOPMENT.md` — new file, development workflow documentation
- `README.md` — added link to DEVELOPMENT.md
- `main/tools.js` — added 7 new inspection tools
- `main/mcp-server.js` — added desktop tool handlers
- `main/main.js` — added desktop tool implementations
- `renderer/app.js` — added inspection API functions and console log capture
- `AI_HANDOVER.md` — updated with current status
- `TASK_CHECKLIST.md` — updated with Phase 3-5 completion
- `TEST_RESULTS.md` — updated with test results

### New Tools Added

#### Live Application Inspection (Phase 4)

- `get_computed_style` — returns computed CSS styles for an element
- `get_accessibility` — returns accessibility info (role, name, state, ARIA)
- `get_console_logs` — returns recent console messages from the editor
- `inspect_element` — comprehensive element inspection (DOM, styles, accessibility, layout, interactive state)

#### Desktop/MCP Testing Tools (Phase 5)

- `get_window_state` — window bounds, focus, visibility, maximized/minimized state
- `get_app_state` — Electron version, platform, memory, uptime, AI server status
- `get_process_info` — process ID, memory usage, CPU usage, uptime

### Git Status

- Branch: `feature/ai-development-workflow`
- Latest commit: `f787e5bd3c103a813172ad8597cfd2afea659983`
- Changes pushed: Yes
- Working tree: Clean

### Current Result

All tests pass. The new inspection tools are available via MCP and can be used by AI agents to inspect the application without relying on screenshots.

### Approval

Awaiting User Approval

Automated checks and file review do not constitute user approval.

The user must personally review/test the work and explicitly approve it before it can be considered approved or merged.

### Next Test/Verification

User must personally review/test the completed Phase 3-5 workflow and explicitly approve it.

---

## Window Sizing Fix

### Date

2026-11-14

### Branch

feature/ai-development-workflow

### Scope

Fix window sizing so the app fits within any screen and is centered, ensuring the taskbar and window controls (minimize/close) are always visible.

### Pre-change Check

Command:

git status --short --branch

Result:

## feature/ai-development-workflow

Working tree was clean before the window sizing fix.

### Automated Application Tests

#### Main Process Smoke Tests

Command:

node test/main-smoke.js

Result:

20 passed, 0 failed

#### End-to-End Editor Tests

Command:

npm test

Result:

98 passed, 0 failed

#### Total

118 passed, 0 failed

### Files Changed

- `main/main.js` — added `screen` import, calculate window size from primary display work area, center window

### Change Details

- Imported `screen` from Electron
- Get `primaryDisplay.workAreaSize` (excludes taskbar)
- Window width = min(1480, 95% of screen width), minimum 980
- Window height = min(920, 95% of screen height), minimum 640
- Added `center: true` to BrowserWindow options

### Current Result

All tests pass. The window now fits within the screen and is centered, so the taskbar and window controls are always visible.

### Approval

Approved

The user personally tested the window sizing fix and confirmed it works correctly.

### Next Test/Verification

A separate approval is required before merging into `main` or releasing the application.

## Remove SVG / Drawing group from Elements tab

### Date

2026-11-14

### Branch

feature/ai-development-workflow

### Scope

Removed the `SVG / Drawing` group (line, rect, circle, ellipse, path) from the Elements tab palette. Only the palette entry in `renderer/app.js` was removed; the SVG support in the editor, MCP tools and `make()` is untouched.

### Static check

`node --check renderer/app.js` — passed.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result with the change: 102 passed, 3 failed.

Result on the unmodified branch (git stash): 102 passed, 3 failed — identical.

Failing in both runs: `get_window_state`, `get_app_state`, `get_process_info`. These are the desktop-state tools and were already failing before this change. Cause not investigated; they may need a real desktop window, which this sandbox does not have.

### Could not be run

- Actual application behavior (the real Electron window). Not run in this sandbox.

### Manual testing for the user

- Open the Elements tab and confirm the `SVG / Drawing` group is gone and the other groups still add and drag onto the page.

### Approval

Awaiting User Approval


## Add missing HTML elements to Elements tab

### Date

2026-11-14

### Branch

feature/ai-development-workflow

### Scope

Added the missing HTML elements to the Elements tab. The tab now offers 98 elements in 12 groups (it offered 25 before). New groups: Text Formatting, Quotes & Code, Inline Details, Form Extras, Table Parts. A plain SVG graphic (`svg`) was added under Media. Changed files: `renderer/app.js`, `test/e2e.js`.

Not added on purpose, because the editor blocks them for security: script, style, iframe, frame, frameset, object, embed, link, meta, base, head, html, body, title, noscript, template, slot, portal. Also not added: obsolete elements (center, font, marquee and similar) and MathML.

### Static check

`node --check renderer/app.js` and `node --check test/e2e.js` — both passed.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result: 107 passed, 3 failed.

The 5 new checks in the "Elements tab" section all passed: no SVG / Drawing group; the tab lists exactly the expected 98 elements; no element appears twice; every element can be added; empty elements are exported without a closing tag.

The 3 failures are the same ones that already failed before any of these changes: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Opened the editor in headless Chromium, took screenshots of the palette and of a page with a sample of the new elements (h3, blockquote, figure, fieldset, dl, table, dialog, svg, progress, hgroup, kbd, details). They rendered correctly and no page errors were raised.

### Could not be run

- The real Electron window. Not run in this sandbox.

### Manual testing for the user

- Open the Elements tab, expand the new groups, and click or drag a few elements onto the page.
- Try the elements that only make sense inside a parent (for example `li` into a list, `td` into a row, `option` into a dropdown) by selecting the parent first.
- Check that Copy page code produces sensible HTML for the new elements.

### Approval

Approved (user said "Approved" on 2026-11-14)


## Show browser-default styles for every element

### Date

2026-11-14

### Branch

feature/ai-development-workflow

### Scope

Every element in the Elements tab is now added with its browser-default styles stored on it, so they show on the canvas and in the CSS tab. Example: a new div gets display: block, position: static, width: auto, height: auto, margin 0, padding. Headings, lists, tables, form controls, links and text formatting elements get their own defaults (for example h3 font-size 1.17em, bold, margin 1em 0; li display list-item; table display table; datalist display none). Where the app's starter styling sets the same property it still wins (for example the div's 16px padding and 64px minimum height, h1/h2/p zero margins, header and nav as flex rows). The starters added in the previous task were simplified so they show true defaults. Changed files: `renderer/app.js`, `test/e2e.js`.

### Static check

`node --check renderer/app.js` and `node --check test/e2e.js` — both passed.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result: 109 passed, 3 failed.

New checks that passed: a new div fills the width of its container on the canvas (832 px in 832 px); the CSS tab shows the expected default values for 16 probe elements (div, p, h3, span, strong, em, a, li, ul, table, td, input, button, blockquote, progress, datalist).

The 3 failures are the same ones that already failed before these changes: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Opened the editor in headless Chromium, added a mix of elements to a blank page and selected a div. The CSS tab showed display block, position static, width auto, height auto, margin 0 and padding 16px, with the "set" counts updated. The canvas rendered the elements with their browser defaults. No page errors were raised.

### Could not be run

- The real Electron window. Not run in this sandbox.

### Manual testing for the user

- Drag several different elements onto the canvas and select each one; check the CSS tab shows sensible default values.
- Change a value (for example the div's width) and check the canvas follows.
- Check Copy page code: elements now carry more CSS than before.

### Approval

Approved (user said "Approved" on 2026-11-14)


## Audit: CSS tab versus all available CSS

### Date

2026-11-14 (read-only; no code changed)

### Method

Listed every CSS property the browser supports (headless Chromium 153: 760 names, of which 587 are standard and 173 are vendor-prefixed) and compared it with the CSS tab's own fields (72) plus the property search list (147 names; 148 together).

### Result

The CSS tab does not offer all CSS properties as ready-made fields or search suggestions. 439 of the 587 standard properties are in neither (many are longhands of a shorthand that is available, such as `margin-top`, `border-top-width` and `text-decoration-color`). Examples of useful ones not suggested: `margin-top`, `padding-left`, `outline-color`, `list-style-type`, `accent-color`, `resize`, `appearance`, `fill`, `stroke`, `mask`, `container-type`, `animation-timing-function`, `transition-property`, `transition-duration`, `perspective`, `color-scheme`, `direction`, `contain`, `zoom`, `all`.

Typing any property name in the search box and pressing Enter does add it, even when it is not suggested. Checked in a browser: `text-decoration-color` (applied to a heading), `--brand` and `-webkit-line-clamp` each added a field. The search list shows at most 40 suggestions.

Drop-down fields offer a short list of values (for example `display` has block, inline, inline-block, flex, inline-flex, grid, none). Any other value, such as `list-item`, `table` or `contents`, can only be set through a property's text field or when it is already set. Text fields accept any value.

### Approval

Not applicable (audit only)


## Fill the gaps in the CSS tab

### Date

2026-11-14

### Branch

feature/ai-development-workflow

### Scope

Changes in `renderer/app.js` (tests in `test/e2e.js`):

- The property search list now holds 600 names: every standard property the browser supports (587) plus 13 common vendor-prefixed ones such as `-webkit-line-clamp` and `-webkit-text-fill-color`. It had 147. The list was taken from headless Chromium 153, so properties newer than that browser are not suggested (they can still be typed and added).
- Search shows names that start with what you typed first, then the rest (up to 40, as before). Enter adds any name, including CSS variables (`--name`) and vendor properties.
- Drop-down fields offer the full set of keyword values for `display`, `float`, `clear`, `visibility`, `overflow`, `font-family`, `font-weight`, `font-style`, `text-transform`, `text-decoration`, `white-space`, `text-wrap`, `justify-content`, `align-items`, `align-self`, `grid-auto-flow`, `background-repeat`, `mix-blend-mode` and `cursor`. The earlier options keep their position and the new ones follow them.
- Text fields (both the panel's own and those added through search) suggest common values for about 300 properties as you type, as native autocomplete. Any other value can still be typed. Properties without a list still suggest the global values (inherit, initial, unset, revert, revert-layer).
- `text-align` has a fourth button, justify, in the same row.
- No layout or styling changes.

### Static check

`node --check renderer/app.js` and `node --check test/e2e.js` — both passed.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result: 118 passed, 3 failed.

New checks that passed: display drop-down offers table, list-item, contents and others; original display options keep their order; text fields suggest common values; text-align has a justify button; search suggests and adds accent-color; search suggests text-decoration-color and puts margin-top first; a CSS variable can be added with Enter; search suggests every property that was missing before.

The 3 failures are the same ones that already failed before these changes: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Took screenshots of the CSS panel (Typography section and the search suggestions). The layout matches the previous version; the justify button sits in the same row as the other three.

### Could not be run

- The real Electron window. Not run in this sandbox.

### Not done

- Dedicated fields for the new properties. They appear as "Custom properties" fields when added through search, as before. Longhands such as `margin-top` therefore sit in that group rather than next to `margin`.
- Value suggestions are common values, not every value the CSS standard allows; the drop-downs and suggestions do not check what is valid for a property.

### Manual testing for the user

- In the CSS tab, search for a few properties (for example `margin-top`, `accent`, `transition-dur`) and add them.
- Click into a text field such as width and check the suggestions appear.
- Open the display drop-down and check the longer value list.
- Click the new justify button on a paragraph.
- Check the panel looks the same as before.

### Approval

Awaiting User Approval


## Fix after rejection: margin and padding per-side fields

### Date

2026-11-14

### Rejection reason

User said: "The margin used to have its individual field for top, right, bottom and left. They are no longer there."

### What was found

The earlier versions on the branch (checked back to the first commit) only had one shorthand text field, "Margin (T R B L)", in the Box Model section. The top/right/bottom/left boxes that do exist are for Inset coordinates under Layout & Positioning, and they are still there. No per-side margin fields were removed. They were added anyway, as requested.

### Change (`renderer/app.js`, tests in `test/e2e.js`)

- Margin and padding each get four fields (top, right, bottom, left) directly under their shorthand field, with the same look as the inset boxes and a "per side" label.
- The side fields and the shorthand field stay in step: typing in a side rewrites the shorthand (for example `16px 16px 16px 8px`, or the shortest equivalent such as `0 0 24px`), and typing the shorthand fills the four sides. Per-side values that were stored on their own (for example `margin-top` from imported HTML) are folded into the shorthand when a side is edited. Sides left empty keep their current computed value.
- Searching for `margin-top`, `padding-left` and the other sides jumps to these fields instead of adding a separate custom field.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result: 126 passed, 3 failed.

New checks that passed: padding and margin sides show the stored values; editing one side updates the shorthand field and the canvas; a margin side is combined with the others; typing the shorthand fills the four sides; a heading shows its default vertical margin per side; searching margin-left jumps to the side field.

The 3 failures are the same ones that already failed before these changes: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Screenshot of the Box Model & Spacing section: the two new rows of four fields sit under Margin and Padding and match the inset boxes. No page errors.

### Could not be run

- The real Electron window. Not run in this sandbox.

### Manual testing for the user

- Select an element, open Box Model & Spacing, and change each margin and padding side; check the canvas and the shorthand field follow.
- Type a shorthand such as `10px 20px` in Margin and check the four boxes fill in.
- Search `margin-top` in the CSS search and check it jumps to the top margin box.

### Approval

Approved (user said "Approved" on 2026-11-14)


## Device size dropdown (replaces the Mobile / Tablet / Desktop buttons)

### Date

2026-11-17

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/index.html`, `renderer/styles.css`, `renderer/app.js`, `main/tools.js` (text only), `test/e2e.js`.

- The three buttons (Mobile 390, Tablet 768, Desktop 880) beside the Viewport fields are replaced by a dropdown in the same spot. It shows "Responsive", or the name of the device whose size is currently set (either way round, so Rotate keeps the name).
- The menu opens upward and lists Responsive, then Mobile, Foldables, Tablets, Desktops and Smart Displays, each device with its width × height, then "Edit…".
- Choosing a device sets the Viewport width and height. The W and H boxes still work; typing a size that matches no device switches the label back to "Responsive".
- "Edit…" opens a dialog listing every device. Name, width and height can be changed, a device can be added to any group or removed, and "Reset to defaults" restores the original list. Changes are saved automatically in the app's local storage (`nexusstudio.devices.v1`). Escape or Done closes it.
- Default sizes (CSS pixels): iPhone SE 375×667, iPhone 16 393×852, iPhone 16 Pro Max 440×956, Pixel 9 / 9 Pro / 10 412×923, Samsung Galaxy A55 412×915, Pixel 9 Pro Fold 791×820 (unfolded), Galaxy Z Fold 6 344×882 (folded), iPad Mini 768×1024, iPad Air 11 820×1180, iPad Pro 13 1032×1376, Surface Pro 10 912×1368, Laptop 1280×800, Laptop HiDPI 1440×900, Desktop HD 1920×1080, Desktop QHD 2560×1440, Nest Hub 1024×600, Nest Hub Max 1280×800. These are my best estimates of the usual CSS sizes, not official figures, which is why they can be edited. The Samsung Galaxy A55 and the two foldables are the least certain.
- Width and height limits are 120 to 10000 wide and 120 to 20000 high (set by another tool's pushed commits; merged without force-push), so 1920 and 2560 desktops fit. The `set_viewport` MCP tool description says 120 to 10000. After the merge: `npm test` 144 passed, 3 failed (same 3 as before).
- Not changed: the page opens at 880 × 640 as before and shows "Responsive".

### Static check

`node --check renderer/app.js`, `main/tools.js` and `test/e2e.js` — all passed.

### Automated tests

Command: `npm test` (run in the AI sandbox)

Result: 144 passed, 3 failed.

New checks that passed: old tab buttons are gone; dropdown starts as Responsive; groups listed in order; every device shows its size; choosing a device sets width, height and the canvas; the label shows the device and the menu closes; Rotate swaps the size and keeps the name; typing a width switches back to Responsive; 1920 wide is accepted; Edit… opens the editor; the editor lists all 19 devices; edit name and width; add and remove a device; edits are saved; Escape closes the editor; the menu shows edited values and choosing one uses them; Reset to defaults restores the original sizes.

The 3 failures are the same ones that already failed before these changes: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Screenshots of the open dropdown, the Edit devices dialog and the footer bar. The dropdown opens upward over the canvas without moving anything, the long list scrolls, and the footer keeps its layout (Viewport boxes left, dropdown centre, Zoom right). No page errors.

### Could not be run

- The real Electron window. Not run in this sandbox.

### Manual testing for the user

- Click the dropdown in the bottom bar, pick a few devices, and check the Viewport boxes and the canvas follow.
- Click Rotate, then type your own width, and check the label changes as described.
- Open Edit…, change a size, add and remove a device, close the app and reopen it, and check your changes are still there.

### Approval

Approved (user said "I approve the dropdowns task too" on 2026-11-17).

---

## Viewport fields as number spinners

### Date

2026-11-17

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/index.html`, `renderer/styles.css`.

- User request (screenshot supplied): make the Viewport values look like `400 ⬍ × 512 ⬍`.
- The Width and Height boxes beside "Viewport" are now number fields (`type="number"`, min 120 / max 10000 wide, min 120 / max 20000 high, step 1) with up/down spinner arrows that stay visible. The "W" and "H" letters inside the boxes are removed. The values are right-aligned next to the arrows and the box is a little wider (60px, was 52px) to fit them.
- Not changed: `renderer/app.js` (typing, spinner clicks, Enter and drag-handle behaviour use the same `input` / `change` handlers and the same limits), the × between the boxes, the Rotate button, the device dropdown, Zoom.

### Automated tests

Command: `node test/e2e.js` (run in the AI sandbox, using the sandbox's Chromium build)

Result: 144 passed, 3 failed. Identical to the run without these changes. The 3 failures are the same ones as before: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Inspected in a browser

Screenshot of the footer with 400 and 512 entered: shows `400 ⬍ × 512 ⬍` with visible spinner arrows and no W/H letters, matching the supplied screenshot. Exact font and colours come from the existing theme, so they may differ slightly from the screenshot.

### Could not be run

- The real Electron window. Not run in this sandbox.
- `node test/main-smoke.js`. Not run (main-process change: none).

### Manual testing for the user

- Click the up/down arrows on each box and check the canvas width/min-height follows and the dropdown label changes to Responsive or the matching device.
- Type a value, press Enter or Tab, and check it still applies. Try Rotate.

### Approval

Approved (user said "Approved" on 2026-11-17).

---

## Add every element blank

### Date

2026-11-17

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/app.js`, `main/tools.js` (text only), `test/e2e.js`.

- User request: layout elements such as header and footer already had content inside; every element should open blank until the user adds content.
- Confirmed in the code: before this change, adding `header` also added "Brand" and "Menu", `footer` added "© Your company", and many others came with starter text or child elements: `nav`, `article`, `aside`, `details`, `form`, `select`, `ul`, `ol`, `table`, `dialog`, `hgroup`, `search`, `picture`, `figure`, `fieldset`, `map`, `dl`, `menu`, `optgroup`, `datalist`, `ruby`, `svg`, the table parts, and every text element (`h1` to `h6`, `p`, `span`, `a`, `button`, formatting and quote elements and so on). The new test run against the old code listed them (for example `header:2`, `nav:3`, `footer:1`).
- Change: `make()` now clears `text` and `children` from the element it builds. Starter styles (boxes keep their grey background and minimum height; the browser-default styles from the earlier task still apply) and attributes are kept. The same function is used by clicking an element in the Elements tab, dragging one onto the Layers tree, and the MCP `add_element` option `use_preset`, so all three give blank elements. Text or children passed explicitly in an MCP call still apply. The `use_preset` description in `main/tools.js` now says the preset has no starter text or child elements.
- Not changed (attributes, not content): `img` and `picture/source` still carry the placeholder picture and alt text; `input` and `textarea` still carry placeholder text ("Type here", "Write a message"); `a` keeps `href="#"`; `video`/`audio` keep `controls`; `progress` and `meter` keep their `value`/`max`; `canvas` keeps its size; `dialog` keeps `open`. The sample page that opens at first start and `new_document` are unchanged (new_document was already blank).
- Side effect to know: an element with no text and no size (for example `p`, `span`, `h1`, `strong`) takes no visible space on the canvas, so select it in the Layers tree or the breadcrumb and type its text in the Properties panel.

### Static check

`node --check` on `renderer/app.js`, `main/tools.js` and `test/e2e.js` — all passed.

### Automated tests

Command: `node test/e2e.js` (run in the AI sandbox)

Result: 146 passed, 3 failed.

New checks that passed: "every element is added blank, with no starter text or child elements" (adds each of the 98 Elements-tab items to an empty page and checks the element has no child nodes); "header and footer are added with nothing inside". Run against the previous `renderer/app.js`, both new checks fail (144 passed, 5 failed), so they do detect the old behaviour.

The 3 failures are the same ones that already failed before: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated. All earlier Elements-tab, browser-default and device-dropdown checks still pass.

### Inspected in a browser

Screenshot of an empty page after adding header, main and footer: the page HTML is `<header></header><main></main><footer></footer>` (ids aside), and the canvas shows the three grey boxes touching each other as one block. No page errors.

### Could not be run

- The real Electron window. Not run in this sandbox.
- `node test/main-smoke.js`. Not run (no main-process change).

### Manual testing for the user

- Add header, footer, nav, article, aside, form, ul, table and a few text elements from the Elements tab and check each arrives with nothing inside.
- Drag an element from the Elements tab onto the Layers tree and check it is blank too.
- Check you can still add content: select an element, type text in the Properties panel, or add other elements inside it.

### Approval

Rejected by the user on 2026-11-17: "Reject. i wish to leave the prefilled elements as it is".

### Revert

`renderer/app.js`, `main/tools.js` and `test/e2e.js` were restored to their state before this task (commit `c9739fc`), so elements are added with their starter text and child elements again, and the two "added blank" checks are removed. Automated tests after the revert (`node test/e2e.js`, AI sandbox): 144 passed, 3 failed. The 3 failures are the same ones as before: `get_window_state`, `get_app_state`, `get_process_info`. Not run: the real Electron window and `test/main-smoke.js`.

---

## Canvas element movement check (read-only)

### Date

2026-11-17

### Branch

feature/ai-development-workflow

### Scope

No files changed except these tracking files. User question: elements placed on the canvas seem restricted and cannot be moved around the canvas area; confirm this.

### Finding

Confirmed. In this version an element cannot be moved by dragging it on the canvas.

- Code: the canvas `mousedown` handler in `renderer/app.js` (the "selection and editing on the canvas" block) only selects the element under the pointer; double-click edits its text. There is no pointer-move handling that changes an element's position. The only drag-on-canvas actions are the selection box's resize handles (right, bottom and bottom-right, which change width and height, never position) and dropping a new element from the Elements tab. The selection outline itself has `pointer-events:none`.
- Browser test (AI sandbox, a scratch script, not part of `npm test`): added a `div` to an empty page and dragged it 200 px right and 150 px down with the mouse. Position before and after: x 284, y 110, unchanged. Then set it to `position:absolute; left:20px; top:20px` through the editor's own `update_element` call and dragged it again: still x 280, y 106, `left` 20px and `top` 20px, unchanged. So dragging does not move it even when absolute positioning is on.
- Ways to move or place an element that do work today: Alt+Up / Alt+Down moves it one place among its siblings; dragging its row in the Layers tab reorders it or moves it into another element; the CSS tab's Position and Inset (top / right / bottom / left) fields place it once `position` is not `static`; the Properties and Elements tabs add new elements into the selected container. The page is a normal document flow, so elements stack in order unless given a position.
- Earlier history of this branch was not checked (the sandbox clone is shallow), so it is not known whether drag-to-move ever existed.

### Automated tests

Not run (no application code changed).

### Could not be run

- The real Electron window. Not run in this sandbox.

### Approval

Not applicable (investigation only). Any change, such as drag-to-move on the canvas, would need the user's explicit request first.

---

## Drag positioned elements on the canvas

### Date

2026-11-17

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/app.js`, `test/e2e.js`.

- User request: in addition to Alt+Up / Alt+Down and the other existing ways, let an element be dragged around the canvas unless it is set to static or has default static properties.
- Rule: dragging works only when the element's computed `position` is not `static`, so `relative`, `absolute`, `fixed` and `sticky` elements can be moved. An element that is set to static, or is static by default (every element added from the Elements tab starts as static), does not move. The page body does not move.
- How it moves: the drag writes `left` and `top`; if the element has `right` or `bottom` set and no `left` or `top`, it writes `right` and `bottom` instead (moving the mouse right lowers `right`). The start point is the element's current computed offset, and the mouse distance is divided by the zoom, so it follows the pointer at any zoom. Values are written in px (a `%` or `calc()` value on `left` or `top` is replaced by a px value once the element is dragged). The element must move at least 3 px before a drag starts, so a click, a double-click to edit text, and selecting still work. The CSS tab fields, the selection box and the code tabs update, and a drag is one Undo step.
- Not changed: Alt+Up / Alt+Down, drag-and-drop in the Layers tab, the resize handles, the Elements tab drag onto the canvas, keyboard shortcuts, the MCP tools.
- Things to know: a static child inside a positioned parent does not move (pressing on the child tries to drag the child; select the parent in the Layers tab or the breadcrumb to drag it); a `sticky` element is written to `left` and `top`, which for sticky shifts its stick offset and may show little or no movement; there is no mouse-pointer hint (such as a move cursor) over elements that can be dragged, because none was requested.

### Static check

`node --check renderer/app.js` and `test/e2e.js` — passed.

### Automated tests

Command: `node test/e2e.js` (run in the AI sandbox)

Result: 154 passed, 3 failed.

New checks that passed (section "Dragging an element on the canvas"): a default-static element does not move; an element set to static does not move; an absolute element follows the mouse and `left`/`top` change by the dragged amount; the CSS tab shows the new `left` and `top`; one Undo restores the old position; a relative element is moved by `left`/`top`; an element placed with `right`/`bottom` moves through those; a fixed element can be dragged; dragging at 80% zoom moves it by the right amount; a plain click selects without moving. Run against the previous `renderer/app.js`, the seven move checks fail (147 passed, 10 failed), so they detect the missing behaviour; the static and plain-click checks pass either way, as they should.

The 3 failures are the same ones that already failed before: `get_window_state`, `get_app_state`, `get_process_info`. Cause not investigated.

### Could not be run

- The real Electron window. Not run in this sandbox (the tests use a browser with mouse input).
- `node test/main-smoke.js`. Not run (no main-process change).

### Manual testing for the user

- In the CSS tab set `position` to `absolute` (or `relative`) on a box, then drag it around the canvas; check the `left` and `top` fields change and Ctrl+Z puts it back.
- Drag a box that is still static and check it stays put.
- Try at a zoom other than 100%, and double-click a positioned text element to edit its text.

### Approval

Awaiting User Approval


## Move cursor and hint for draggable elements (2026-11-17)

- `node test/e2e.js`: 159 passed, 3 failed (`get_window_state`, `get_app_state`, `get_process_info`, same as before). New checks: move cursor and "Drag to move" hint over a draggable element; gone on leaving and while pressing; absent on static elements; not in the exported page code.
- Not run: real Electron window; user must test.

## Element documentation from the canvas tag (2026-11-17)

- `node test/e2e.js`: 168 passed, 3 failed (`get_window_state`, `get_app_state`, `get_process_info`, same as before).
- Docs-folder search tried on sample MDN-copy, Zeal and DevDocs folder layouts: found the right page each time.
- Real-click screenshot in a browser: the tag opens the guide dialog.
- `node test/main-smoke.js` crashes in the sandbox (`screen.getPrimaryDisplay` undefined in the Electron stand-in), also without these changes.
- Not run: real Electron window, opening MDN online, a real downloaded docs copy; user must test.

### Approval

Awaiting User Approval

## Element documentation: MDN and Zeal buttons (fix after rejection, 2026-11-17)

- `node test/e2e.js`: 169 passed, 3 failed (same 3 as before).
- Zeal launcher tried with a fake `zeal` program: it received `html:div`; a missing program was reported as not found.
- Not run: real Zeal, MDN opening, real Electron window; user must test.

### Approval

Awaiting User Approval

## Element documentation: browser opening and Zeal discovery (second fix, 2026-11-17)

- `node test/e2e.js`: 172 passed, 3 failed (same 3 as before). New checks: address shown, Copy link, step-by-step Zeal help.
- Not run: real Windows/WSL browser opening, real Zeal; user must test.

### Approval

Awaiting User Approval

## Independent dragging, move in/out of boxes, full HTML document (2026-11-18)

- `node test/e2e.js`: 188 passed, 3 failed (`get_window_state`, `get_app_state`, `get_process_info`, same as before). New checks: edge drops, drag into a box, no jump, drag out of a box, Alt only moves, Move out of box button, HTML tab is a complete document, Apply keeps the design.
- Not run: real Electron window; user must test.

### Approval

Awaiting User Approval

## Collapsible panels and several pages (2026-11-20)

- `node test/e2e.js`: 213 passed, 3 failed (`get_window_state`, `get_app_state`, `get_process_info`, same as before).
- Looked at the app in a browser: page tabs and both collapsed panels render correctly.
- Not run: real Electron window, real export dialog; user must test.

### Approval

Awaiting User Approval

## 2026-11-20 — Delete message, rail tabs, in-app save chooser

- `node test/e2e.js`: 224 passed, 3 failed. The 3 failures (get_window_state, get_app_state, get_process_info) were failing before this work.
- New checks: delete-page message with Keep/Discard, rail tab opens one tab only, + on fresh project asks folder then file name, overwrite warning, Escape cancels, buttons fit a 640px-tall screen (screenshot checked).

---

## Rails: a rail tab opens only that tab

### Date

2026-11-20

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/app.js`, `renderer/styles.css`, `test/e2e.js`.

- User report: the per-tab buttons on the collapsed strips opened every tab, not just the one clicked; the arrow is meant to open everything.
- Confirmed first (no code changed): with both panels collapsed, clicking Layers brought back the Elements and Layers tab buttons; clicking CSS brought back HTML, CSS and JavaScript. The earlier test only checked which content was showing, not the tab buttons.
- Change: a rail tab now opens the panel in a "single tab" state (`.work.sl` / `.work.sr`): only that tab's button and the collapse arrow are shown. The arrow on the strip opens the whole panel with every tab. Hiding the panel and opening it again with the arrow also gives every tab. The single-tab state is not remembered across a reload (a panel that is open after a reload shows every tab). In the narrow-window layout (rails hidden) every tab button is shown as before.
- Not changed: folder-first saving, the top-bar name and `/index.html`, the in-app save window, the delete-page message, the window title. The user chose to leave the saving work for now.

### Static check

`node --check` on `renderer/app.js` and `test/e2e.js` — passed.

### Automated tests

Command: `node test/e2e.js` (AI sandbox)

Result: 230 passed, 3 failed. The 3 failures are the same ones as before: `get_window_state`, `get_app_state`, `get_process_info` (they are handled in the main process; the test calls them on the editor page).

New checks that passed: only the Elements tab button after the Elements rail tab; only the CSS tab button after the CSS rail tab; only the Layers tab button after the Layers rail tab; the arrow opens both Elements and Layers; the arrow opens HTML, CSS and JavaScript; hiding then using the arrow after a single tab still opens everything. Against the previous `renderer/app.js` and `styles.css`, the three single-tab checks fail (227 passed, 6 failed).

### Inspected in a browser

Screenshot with both panels collapsed, then Layers and CSS opened from the strips: the left panel shows only "Layers" with its arrow, the right panel only "CSS".

### Could not be run

- The real Electron window. Not run in this sandbox.
- `node test/main-smoke.js`: crashes (`screen` is missing from the test's stand-in for Electron, since a Dyad commit on 2026-11-14). Not changed here.

### Manual testing for the user

- Collapse both panels. Click each rail tab and check only that tab and its arrow show. Click the small arrow on a strip and check every tab shows.

### Approval

Approved (user said "Rail task - Approve" on 2026-11-20).

---

## User decisions on the 2026-11-20 "Delete message, rail tabs, in-app save chooser" task

- In-app save window: Approved (user said "In-app save window - Approve").
- Folder-first saving: Rejected (user said "Folder-first saving - Reject"). Reason: the file name is not reflected on the page after saving. Deferred; the code is unchanged. No tests were changed.
- One-tab rails: see the "Rails: a rail tab opens only that tab" section above (Approved).
- Delete-page message: Rejected later the same day (user said "Delete page message - Rejected"): it should appear only if the page was modified. See the next section.

---

## Delete-page message only for a modified page

### Date

2026-11-20

### Branch

feature/ai-development-workflow

### Scope

Files changed: `renderer/app.js`, `test/e2e.js`.

- User report: the message should open only if the page has been modified; otherwise the page should close without any message.
- Reproduced first: add a page with + and click its delete button without touching it: the message appeared. Cause: the check used the project-wide "unsaved" flag, which adding a page, renaming a page and any edit on any page all set.
- Change: each page stores a snapshot of its content (elements, CSS, JavaScript, title) taken when it is created, opened or last saved (`pageSnap`, `markClean`, `isPageModified`). Deleting asks only when the page's current content differs from that snapshot. So: a new blank page, a duplicate nobody changed, and a page that was modified and then saved close with no message; a page you edited asks; editing another page does not make this one ask; editing a page and undoing everything back to the start does not ask. Renaming a page does not count as modifying it. The message text and its Save / Discard / Keep buttons are unchanged.
- Not changed: folder-first saving (rejected, deferred), rails, in-app save window.

### Static check

`node --check` on `renderer/app.js` and `test/e2e.js` — passed.

### Automated tests

Command: `node test/e2e.js` (AI sandbox)

Result: 236 passed, 3 failed. The 3 failures are the same ones as before: `get_window_state`, `get_app_state`, `get_process_info` (main-process tools that the test calls on the editor page).

New or changed checks that passed: deleting a duplicate nobody modified closes with no message; the + button adds a blank page and deleting it closes with no message; editing another page does not make an untouched page ask; a modified page shows the message; Keep and Discard still work (existing checks); in the desktop stand-in, a page that was modified and then saved closes with no message. Against the previous `renderer/app.js`, the first of these fails.

### Could not be run

- The real Electron window. Not run in this sandbox.
- `node test/main-smoke.js`: crashes (`screen` is missing from the test's stand-in for Electron, since a Dyad commit on 2026-11-14). Not changed here.

### Manual testing for the user

- Add a page with + and delete it straight away: it should close with no message.
- Add an element to a page and delete it: the message should appear. Try Keep page, Discard, and Save.
- Edit page 1, switch to a new untouched page 2 and delete it: no message.

### Approval

Awaiting User Approval

## Close a tab without deleting the page

### Automated tests

Command: `node test/e2e.js` (AI sandbox). Result: 239 passed, 3 failed (same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`).

New checks that passed: closing shows no message and moves the page to the Closed list; the page is still in `list_pages` as closed; the Closed button lists it; reopening restores the tab and content; closing a modified page needs no message; a closed page is still closed after a reload; Delete in the list asks first; Keep page cancels; confirming removes the page for good; the last open tab has no close button.

### Could not be run

- The real Electron window. `node test/main-smoke.js` (crashes on a missing `screen` in its stand-in, not changed).

### Manual testing for the user

- Add a page with content, click `×`: the tab goes, "Closed (1) ▾" appears. Save, then Open project: the page is still in the Closed list.
- Click Closed, click the page name: it reopens with its content.
- Click Closed, Delete next to a page: a message asks; Keep page cancels, Delete page removes it for good.

### Approval

Awaiting User Approval

## Pages tab (file explorer for pages)

Command: `node test/e2e.js` (AI sandbox). Result: 240 passed, 3 failed (same as before: `get_window_state`, `get_app_state`, `get_process_info`). Screenshot of the tab checked.

Passed: the tab lists all pages; closing a tab keeps the page in the tree as closed; clicking a closed page reopens it; clicking an open page switches to it; closed pages survive a reload; reopened page keeps its content; tree delete asks first, Keep page cancels, confirming removes it; the last open tab has no close button.

Not run: the real Electron window.

Manual testing: open the Pages tab, add pages, close one with `×` (it stays in the tree, grey), click it to reopen, hover a row and use the ✕ to delete (asks first). Save, then Open project: closed pages are still in the tree.

### Approval

Awaiting User Approval

## Drag to reorder pages

Command: `node test/e2e.js` (AI sandbox). Result: 242 passed, 3 failed (same 3 as before).

Passed: dragging a page above another moves it and the tabs follow; Alt+Down moves a page one place and the open page stays open.

Not run: the real Electron window.

Manual testing: in the Pages tab, drag a page up or down (a blue line shows where it will drop). Check the tabs follow, then save and reopen the project to see the order kept.

### Approval

Awaiting User Approval
