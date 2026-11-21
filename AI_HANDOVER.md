# AI Handover

## Current Task

Close tab vs delete page (state: Approved 2026-11-21; it replaces the delete-page message task, which the user said did not fit how they work). Approved on 2026-11-20: the one-tab rails and the in-app save window. Rejected on 2026-11-20 and deferred: folder-first saving (the code is unchanged; design notes are in the "twenty-third request" session below).

- 2026-11-21: user explicitly REJECTED folder-first saving (not changed, not being worked on). Phase 8 to be discussed later. No tasks are awaiting approval.

- 2026-11-21: NEW MANDATORY RULE in AGENTS.md (top section): before any change, read the app state, explain in simple English what was found, the errors and how to fix them and what will change, and get the user's explicit approval of the plan. Phase 8 verification done (see TASK_CHECKLIST.md): Approved 2026-11-21, and the new rule is Approved. Gap found: `main` not protected on GitHub.

- 2026-11-21: added iframe/embed/object/math to the Elements tab (Approved 2026-11-21). These three were previously blocked for security (see the earlier note 'Deliberately not added'); they are now allowed in the document but only shown as boxes in the editor and Preview. Next the user wants to move on to the CSS tab on the right.

## Latest Session (2026-11-21, follow-up: files named after pages — Approved 2026-11-21)

- Folder export was Approved on 2026-11-21. Follow-up: export files use the page name (`fileStem` in `renderer/app.js`); no more forced `index`. Tests: 250 passed, 3 old failures.

## Earlier Session (2026-11-21, folder export; nothing added without consent)

- User request: `.nexus` keeps all pages; exporting a page writes a folder with html, css and js as separate files in css/ and js/ subfolders; the app must stop adding its own styles/code. Answers: subfolders; panel styles only in the CSS file under the user's id/class (inline otherwise); remove reset and Google Fonts.
- Done: `renderer/app.js` (`calcSel`, `genCss`, `pageCss`, `fullDoc`, `pageFiles`, `exportFilesOf`, `ACT.exportPagesTo`, chooser `folder` mode), `main/main.js` (`fb:exportFolder`, old `fb:exportHtml`/`fb:exportPages` removed), `main/preload.js`, `renderer/styles.css`, `renderer/index.html`, tests.
- Known: top bar still shows fixed `/index.html` and folder-first saving item is still deferred. Blank new pages have no body styles now.
- Not run: real Electron window.
- Next action: wait for APPROVE/REJECT. Do not merge into `main`.

## Earlier Session (2026-11-20, twenty-seventh request: drag to reorder pages)

- User request: add drag-to-reorder to the Pages tab.
- Done: rows in `#pgTree` are draggable; a line shows where the page will land; dropping calls `movePage(from,to)`, which keeps the open page open, marks the project unsaved, and the tabs follow the new order. Keyboard: Alt+Up / Alt+Down on a focused row moves it one place. Order is saved with the project (it is the order of `S.pages`).
- Tests: `node test/e2e.js` 242 passed, 3 failed (same 3 old failures). Real Electron window not run.
- Approval: the user said "Approve" on 2026-11-20 after this task. The earlier close-tab and Pages-tab tasks were not approved by name; they are still recorded as Awaiting User Approval.

## Previous Session (2026-11-20, twenty-sixth request: Pages tab, a tree of every page)

- User request: instead of the Closed list, a file explorer showing all pages of the file; closing a tab never removes a page from it; click a page in the tree to reopen it. User chose: a new "Pages" tab in the left panel (next to Elements and Layers) and to remove the "Closed (n)" button.
- Done: new left-panel tab `#tabPg` / pane `#pgPane` / tree `#pgTree` (also a Pages button on the collapsed rail). Root row shows the project file name (or "Project"); each page is a row: open page highlighted, closed pages grey italic with "closed". Click a row opens it (reopens the tab if closed). Hover shows a delete button, which asks "Delete ... from the project?" (Keep page / Delete page). Removed `#pgClosed` button and `#pgClosedList`. Tab `×` still only closes. `renderPageTree()` is called from `renderPageBar()`.
- Tests: `node test/e2e.js` 240 passed, 3 failed (same 3 old failures). Screenshot checked. Real Electron window not run.
- Not done (not requested): rename from the tree (still double-click the tab), drag to reorder.

## Previous Session (2026-11-20, twenty-fifth request: closing a tab keeps the page)

- User report: a closed page was missing after Open project. User answer: "any page that i name and deleted don't have to be deleted completely from the project. I might be deleting the page to make room for other pages."
- Done: the tab `×` now only closes the tab. A closed page stays in `S.pages` with `closed:true`, is saved in the `.nexus` file (`closed` is kept by `cleanState`) and in the browser draft. A "Closed (n) ▾" button next to `+` lists closed pages: click one to reopen it, or Delete (asks first, dialog `#pgDel` now has Keep page / Delete page) to remove it from the project for good. No message when closing, even for a modified page, because nothing is lost. The last open tab has no `×`. AI tool `delete_page` still deletes for good; `list_pages` now reports `closed`; `select_page` reopens a closed page. Functions: `closePage`, `reopenPage`, `deletePageAt`, `openPages`, `closedPages`, `neighborOpen`, `toggleClosedList`.
- Files: `renderer/app.js`, `renderer/index.html`, `renderer/styles.css`, `main/tools.js` (description), `test/e2e.js`.
- Tests: `node test/e2e.js` 239 passed, 3 failed (same 3 old main-process tool failures).
- Not run: the real Electron window.

## Previous Session (2026-11-20, twenty-fourth request: delete message only for a modified page)

- User request: the delete-page message must open only if the page was modified; an unmodified page closes without any message.
- Reproduced: untouched new page still showed the message (project-wide `S.dirty` was used).
- Done in `renderer/app.js`: `pageSnap`, `markClean`, `isPageModified`; `addPage` stores the new page's snapshot; `loadState`, `savedProject` and boot call `markClean()`; `askDeletePage` uses `isPageModified(S.pageIdx)`.
- Done in `test/e2e.js`: old duplicate-delete check rewritten; new checks for blank page, duplicate, editing another page, modified page, modified-then-saved. `node test/e2e.js` gives 236 passed, 3 failed (same 3 as before).
- Known limit: a page with no stored snapshot (should not happen) falls back to the project-wide unsaved flag. Renaming a page does not count as modifying it.
- Not run: real Electron window; the user must test.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Resume folder-first saving only when asked. Do not merge into `main`.

## Earlier Session (2026-11-20, twenty-third request: rails fixed; saving deferred)

- User report: the delete-page confirmation is gone (good); the in-app save window is fine; per-tab rails still open every tab (rejected: the arrow should open everything, a tab button only that tab); folder-first saving rejected because nothing on the page reflects the file name.
- Confirmed in a browser before any change: clicking a rail tab showed all tab buttons; after saving as `my-site` the top bar still said `nebula-landing-v2` + fixed `/index.html` and only the window title changed (to `my-site.nexus`).
- Done (rails): `renderer/app.js` (`solo` state, `setPanel(side,collapsed,single)`), `renderer/styles.css` (`.work.sl` / `.work.sr` hide the other tab buttons; narrow layout shows them). 7 new e2e checks. `node test/e2e.js` gives 230 passed, 3 failed (same 3 as before).
- NOT done (deferred by the user, "leave the folder/file creation stuff for now"). The user's decisions for when it is resumed:
  - The editable name in the top bar is the PAGE name (renames the page); remove the fixed `/index.html`.
  - The window title (now `NexusStudio - <file>.nexus`) should show the folder name followed by the file name / page name.
  - Every saved file gets `.html` (user chose `.html` over `.htm`). The CSS and JavaScript are saved automatically in the same folder as companions of each html file (html links to them). No `.nexus` file: Open reads the `.html` and its `.css`/`.js` back; with several pages each page is its own set of files opened one at a time.
  - Design risk found: the CSS companion would hold the editor's generated per-element rules and the user's custom CSS; on reopening, old generated rules would override new edits. Mark the generated section in the file and rebuild element styles from it (do not load it as custom CSS).
  - Relevant code: `main/main.js` (`file:save`, `fb:saveProject`, `fb:read`, `FB_KINDS`, `win:docname`), `main/preload.js`, `renderer/app.js` (`ACT.saveWith`, `savedProject`, `openedProject`, `chooseLocation`, `fullDoc`, `genCss`, `importHtml`, `docOfPage`, `S.file`).
- Known: `node test/main-smoke.js` crashes (`screen` missing from its Electron stand-in since Dyad commit `130d85b`); the 3 e2e failures are a test mismatch (those tools live in `main/mcp-server.js`). Neither was touched.
- Not run: real Electron window testing. The user must test it.
- Result (2026-11-20, later): user approved the rails and the in-app save window, and explicitly rejected folder-first saving (not reverted; deferred).
- Next action: wait for the user's next instruction; resume the folder-first saving fix (notes above) only when asked. Do not merge into `main`.

## Earlier Session (2026-11-20, twenty-first request: collapsible panels and several pages)

- User request: collapse arrows for the left panel (Elements and Layers) and the right panel (Properties with HTML, CSS, JavaScript) to make room for the canvas, and more than one page in a project. User chose: page tabs one at a time; every page has its own CSS and JavaScript.
- Done in `renderer/index.html`, `styles.css`, `app.js` (panels): arrow button (`#colL`, `#colR`) in each panel header collapses it to a thin strip with a vertical label and an arrow (`#railL`, `#railR`) that brings it back; the canvas grows; state remembered in localStorage (`nexusstudio.panels.v1`). Hidden on narrow windows (single column layout).
- Done (pages): a tab bar above the canvas (`#pagebar`): click a tab to open a page; `+` adds a blank page; the open page's tab has duplicate and delete buttons (delete needs a second click within 3 s); double-click or F2 renames. `S.root/css/js/title` always hold the open page; `S.pages` holds the list (`syncActive()`, `allPages()`, `fullState()`, `switchPage()`, `addPage()`, `deletePage()`, `renamePage()`). Each page has its own undo history; undo only affects the open page. Add, delete and rename page are not undoable. Draft (localStorage) and project files now store all pages (`pages`, `idx`; old single-page files still open as one page; `cleanState` cleans every page, max 30).
- Done: File menu "Export all pages…" (`file:exportPages` IPC in `main/main.js`, `preload.js`): one Save dialog for the first page's name; other pages are written next to it as `<name>-<page-name>.html` (numbered if the file exists, never overwritten). "Export HTML…" and "Copy page code" still export the open page only. Preview, HTML, CSS and JavaScript tabs show the open page.
- Done in `main/tools.js` + `app.js`: MCP tools `list_pages`, `add_page`, `select_page`, `rename_page`, `delete_page`; other tools act on the open page; `new_document` replaces only the open page.
- Tests: `node test/e2e.js` gives 213 passed, 3 failed (the same 3 as before). New checks cover tabs, separate CSS/JS per page, switching, per-page undo, rename, duplicate, delete, reopening, panel collapse and restore, export-all hand-off. Not run: real Electron window and the real export dialog; user must test.
- Known limits: pages share the viewport size; links between pages are not created automatically; the file name shown at the top is the open page's title.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-18, twentieth request: independent dragging, approved)

- User request: drag any element independently (a div must not drag other elements along; those only follow if really placed inside it), be able to take an element out of a box without deleting it (Delete removed it from the page completely), and have the generated HTML wrapped in doctype, html, head and body.
- Finding: a box carries only the elements that are really its children. Elements ended up as children because dropping from the Elements tab onto a box always nested inside it, and earlier clicks nested too (fixed in the earlier request). There was no way to take a child out except deleting it or the Layers panel.
- Done in `renderer/app.js`:
  - Canvas drag now also moves an element into or out of a box: while dragging, the box under the pointer is outlined (dashed) and the hint says "Release to put it inside <x>" / "Release to take it out of its box"; on release the element is re-parented and keeps its on-screen position (left/top recomputed). Holding Alt while dragging only moves it. Dropping on the page background takes it out to the top level. Never drops an element into itself or its own contents.
  - New "Move out of box" button (Selection menu, Alt+Left) puts the selected element right after its box (`moveOut()`).
  - Dropping a palette item on a box: top 20% or bottom 20% places it before/after the box, the middle places it inside.
  - The HTML tab now shows a complete document (`genHtmlView()`): `<!DOCTYPE html>`, `<html lang="en">`, head (charset, viewport, title, comment that styles are in the CSS tab), `<body>`. Apply reads the full document (title included). Copy page code and Export already gave a full document.
- Done in `renderer/index.html`: the Move out button. Done in `test/e2e.js`: 8 new checks plus the palette-drop check now drops in the middle of the box.
- Tests: `node test/e2e.js` gives 188 passed, 3 failed (the same 3 as before). Not run: real Electron window.
- Known limits: an element dragged over a box by accident is moved into it (the outline and hint warn before release; Alt avoids it). MCP `get_html`/`get_full_html` unchanged.
- Dyad's earlier attempt was reverted in commit `2da36d9`; only one tool should change the code at a time.
- Result: approved by the user on 2026-11-18 (also covers the earlier "drag every element" and "add after the selection" changes). Do not merge into `main` without separate approval.

## Earlier Session (2026-11-17, nineteenth request: restore after Dyad)

- User report: Dyad was asked to make elements draggable individually; the user rejected its changes and asked Dyad to revert, but the result was not the state before. Dyad reported a conflict in the renderer files.
- Finding: the branch had 3 Dyad commits on top of `b5859fa` (the last commit by Claude): `39f77e7` (new drag that sets `position:absolute` and re-renders on every move, full document in HTML view), `47cb633` (a merge that re-applied a large mix of changes) and `6383716` (a partial undo). The final state had lost the element documentation dialog and `docs.js` wiring, the device-size dropdown (replaced by a different `#ddv` control), the move cursor and hint, the click-adds-after rule and the canvas drag.
- Done: restored every file to exactly how it was at `b5859fa` with a new commit (no force-push, history kept). Tree identical to `b5859fa`; `node test/e2e.js` should give 180 passed, 3 failed (same 3 as before).
- My own unfinished work for the earlier request (independent dragging with taking an element in or out of a box, "Move out of box" button, HTML tab showing a full document) is saved on the local branch `wip-independent-drag` / stash and is NOT pushed.
- Next action: wait for the user. Do not merge into `main`.

## Earlier Session (2026-11-17, eighteenth request)

- User report: after adding a div and then an h1, the h1 could not be dragged independently of the div, "even if the h1 is not placed inside the div"; wants every element draggable independently, in or out of any element, without dragging its container or everything on the canvas.
- Investigation (reproduced in a browser): clicking an Elements-tab item added it INSIDE the selected element whenever that element was a container (div, section and so on), so the h1 really was the div's child (`body(div(h1))`). Dragging the h1 itself moved only the h1 (the earlier drag feature works per element); but moving the div would carry the h1 with it, and every new element kept nesting into the previous one.
- Done in `renderer/app.js`: `clickZone()` and `NEEDS` table. A clicked palette element is now added as a sibling right AFTER the selected element (page root: inside). Parts that need a parent (li, dt/dd, tr, td/th, thead/tbody/tfoot, caption, colgroup, col, option, optgroup, source, track, area, figcaption, legend, summary, rt/rp) still go inside a valid selected parent, or next to a selected sibling of the same kind. Dragging a palette item onto a box on the canvas, and dragging in the Layers panel, still place it inside (that is how to nest on purpose). The tooltip on palette items says so. Dragging on the canvas moves any element on its own (relative offset), as before.
- Done in `test/e2e.js`: checks that div, h1, p are siblings; dragging the h1 leaves the div and p in place; list items and table parts nest correctly; dropping from the palette onto a box nests.
- Tests: `node test/e2e.js` gives 180 passed, 3 failed (the same 3 as before). Not run: real Electron window.
- Not done / limits: dragging on the canvas moves an element visually with left/top; it does not change which element is its parent. Re-parenting is done by dragging in the Layers panel or dropping from the palette. Elements already nested in an existing page still move with their parent.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, seventeenth request)

- User request: every element must be draggable around the canvas regardless of its default position (earlier rule excluded static elements, but nearly every element is static by default).
- Done in `renderer/app.js`: the drag handler no longer stops at `position:static`. When a static element starts to move (after 3 px) it is switched to `position:relative` and `left`/`top` are written, so it moves visually but keeps its place in the page flow (neighbours do not shift). Already positioned elements keep their position type (absolute, fixed, sticky, relative; right/bottom handled as before). The move cursor and "Drag to move" hint now show over every element except the page itself. A plain click still only selects; one Undo reverses the whole drag including the position change.
- Design choice to confirm with the user: `relative` (not `absolute`) was used because it does not pull the element out of the layout.
- Done in `test/e2e.js`: the two old "static does not move" checks and the "no cursor on static" check now expect the opposite; new checks for undo and plain click.
- Tests: `node test/e2e.js` gives 175 passed, 3 failed (the same 3 as before). Not run: real Electron window.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, sixteenth request, approved)

- User approved the MDN/Zeal documentation work (fifteenth request) and asked for an extra button that opens the element on the W3Schools website.
- Done: `Open on W3Schools (online)` button in the documentation dialog (`renderer/index.html`, `app.js`); `docs:openOnline` in `main/main.js` takes an optional site (`mdn` or `w3schools`; anything else means MDN) and builds `https://www.w3schools.com/tags/tag_<tag>.asp` (svg: `/graphics/svg_intro.asp`); `main/preload.js` passes the site. Same browser-opening method, link display and Copy link as the MDN button.
- Tests: `node test/e2e.js` gives 173 passed, 3 failed (the same 3 as before).
- Not verified: the W3Schools pages were not opened (no internet here). A few newer elements (for example hgroup, search) may have no W3Schools page; the link would then show W3Schools' not-found page and MDN can be used instead.
- Result: approved by the user on 2026-11-17. Do not merge into `main` without separate approval.

## Earlier Session (2026-11-17, fifteenth request, approved)

- User rejected again: "Open on MDN" showed "opened in your browser" but no browser opened (4 browsers installed, one default); and the Zeal path box was not understandable (Zeal is an application, not a folder).
- Causes found: (1) `shell.openExternal` resolves with no value, so success was reported even when nothing opened, and the real environment (Windows or WSL) was unknown; (2) the Zeal launch treated the resolved `dash://` call as failure, so the path box could appear even when it worked; (3) Zeal was only looked for in a few fixed places and the path box gave no guidance.
- Done in `main/main.js`: `openUrl()` (uses `wslview` or `cmd.exe /c start` when Electron runs inside WSL, otherwise `shell.openExternal`; returns the method used); `docs:openOnline` returns url, method and platform; `findZeal()` looks at Start Menu and Desktop shortcuts (resolved with `shell.readShortcutLink`), Program Files, Local AppData, scoop, Downloads/Desktop/Documents and WSL `/mnt/c` paths; `docs:openZeal` treats the `dash://` fallback as success; `docs:setZealPath` accepts a folder, `zeal.exe` or a shortcut (.lnk), converts `C:\` paths in WSL, and saves the real exe path.
- Done in `renderer/`: the MDN address is always shown with a "Copy link" button; the message now says which method and platform were used and tells the user what to do if no window appears; when Zeal is not found, the box asks for the Zeal folder and step-by-step help is shown (Start, type Zeal, right-click, Open file location, copy the address-bar path).
- Tests: `node test/e2e.js` gives 172 passed, 3 failed (the same 3 as before); file search helper tried on a sample folder.
- Not verified: real browsers/Windows/WSL behaviour (none available here), real Zeal. If MDN still does not open, ask the user to read the method and platform shown in the dialog message.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, fourteenth request, rejected)

- User rejected the docs-folder design: the dialog opening from the tag is fine, but the buttons should either take the user online to the MDN page or open the Zeal application on the element page (user has Zeal and an HTML docset installed). The folder-chooser Explorer window also extended beyond the screen so it could not be minimised or closed.
- Done: removed the docs-folder buttons, `docs:chooseFolder`, `docs:openLocal` and the folder search. No file dialog is used any more.
- Done in `renderer/index.html` / `app.js`: buttons are now "Open on MDN (online)" and "Open in Zeal (offline)" (Zeal button only in the desktop app). If Zeal is not found, a text box appears to type the path of `zeal.exe` (checked: absolute path, file name zeal/zeal.exe, file exists), then Zeal opens.
- Done in `main/main.js` and `main/preload.js`: `docs:openZeal` looks for Zeal in the usual Windows places (Program Files, Program Files (x86), %LOCALAPPDATA%\Programs\Zeal, %LOCALAPPDATA%\Zeal, scoop, C:\Zeal) and common Linux paths, runs `zeal html:<tag>` (svg uses `svg:<tag>`), then tries `zeal` on PATH (Linux), then the `dash://html:<tag>` address; otherwise asks for the path. `docs:setZealPath` saves it in `settings.json` as `zealPath`. `docs:openOnline` unchanged (MDN in the default browser). Executable is never taken from page text except the checked path; the tag is checked with a strict pattern; sender checked with `fromEditor`.
- Tests: `node test/e2e.js` gives 169 passed, 3 failed (the same 3 as before). The launcher was also tried here with a fake `zeal` program (received `html:div`; missing program reported as not found).
- Not verified: real Zeal on Windows (the Zeal docset keyword must be `html`, which is Zeal's default for the HTML docset); real MDN opening (no internet here); real Electron window.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, thirteenth request, rejected)

- User request: make the small blue element-name tag on the canvas clickable and open documentation for that element, offline (Zeal or any HTML docs), with an option to open MDN online or a locally downloaded documentation. User chose: built-in guide + MDN + user's own docs folder.
- Done in `renderer/docs.js` (new): built-in offline guide for all 98 palette elements plus `body` (what it is, where it goes, key attributes, example). Loaded before `app.js`.
- Done in `renderer/index.html` / `styles.css` / `app.js`: `#ovLab` is now a button; clicking it opens the `#docDlg` dialog with the guide and three buttons: Open on MDN (online), Open from my docs folder, Choose docs folder… (the two folder buttons show only in the desktop app). Escape/Close/backdrop close it.
- Done in `main/main.js` and `main/preload.js`: IPC `docs:openOnline` (opens `https://developer.mozilla.org/en-US/docs/Web/HTML/Element/<tag>` in the browser; tag checked with a strict pattern), `docs:chooseFolder` (folder dialog, saved in `settings.json` as `docsFolder`), `docs:openLocal` (searches the chosen folder, up to 14 levels / 20000 entries, for `.../element/<tag>/index.html` (MDN copy, Zeal) or `<tag>.html` (DevDocs) and opens it with `shell.openPath`). All three check the sender with `fromEditor`. No security setting weakened.
- Done in `test/e2e.js`: "Element documentation" checks (every palette element has an entry; tag is a button; dialog opens; MDN link; Escape; desktop stand-in IPC flow).
- Tests: `node test/e2e.js` gives 168 passed, 3 failed (the same 3 as before). The docs-folder search was also tried on sample MDN, Zeal and DevDocs folder layouts and found the right pages.
- Not verified: the MDN address was not opened (no internet here); real Electron window; a real downloaded MDN/Zeal/DevDocs copy. `node test/main-smoke.js` crashes in this sandbox (`screen.getPrimaryDisplay` is undefined in the test's Electron stand-in) with or without these changes; not caused by this task.
- Known limits: SVG shapes (circle, path…) have no built-in entry (the dialog says so and offers MDN). Folder search can miss pages if the docs use another layout.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, twelfth request)

- User request: before approving drag-to-move, add a move cursor and a hint over draggable elements.
- Done in `renderer/app.js`: a `mousemove` handler on the stage adds class `nx-move` to the hovered element when it is draggable (same rule as the drag: not static, not the root, not the selection box, not text being edited) and shows `#moveHint`; both clear on leave, on mouse press and while dragging.
- Done in `renderer/index.html` / `renderer/styles.css`: `#moveHint` ("Drag to move") and `.page .nx-move` (cursor: move, also for children).
- Done in `test/e2e.js`: 5 checks (cursor and hint show; hide on leave; hide while pressing; none on static elements; class not in the exported page).
- Tests: `node test/e2e.js` gives 159 passed, 3 failed (the same 3 as before). Not run: real Electron window.
- Result: approved by the user on 2026-11-17 (covers drag-to-move and the move cursor / hint). Do not merge into `main` without separate approval.

## Earlier Session (2026-11-17, eleventh request)

- User request: in addition to Alt+Up/Down and the other ways to move elements, allow dragging an element on the canvas unless it is set to static or has default static properties.
- Done in `renderer/app.js`: a capture `mousedown` handler on the stage (after the selection handler) starts a drag when the pressed element's computed `position` is not `static`; after 3 px it writes `left`/`top` (or `right`/`bottom` when those are the element's own offsets) through `setStyle`, divides by `S.zoom`, and on mouse-up calls `commit()`, `renderProps()` and `renderCodeIfOpen()` (one Undo step).
- Done in `test/e2e.js`: "Dragging an element on the canvas" (10 checks).
- Not changed: resize handles, Layers drag-and-drop, Alt+Up/Down, Elements tab drops, `main/` files, MCP tools. No move cursor or other visual hint was added (not requested).
- Known limits: a static child of a positioned parent does not move (select the parent); sticky elements get `left`/`top` written but may barely move; `%`/`calc()` offsets become px after a drag.
- Tests: `node test/e2e.js` gives 154 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`). The seven move checks fail on the old code.
- Not run: real Electron window testing and `test/main-smoke.js`. The user must test it.
- Next action: wait for the user to test and say `APPROVE` or `REJECT`. Do not merge into `main`.

## Earlier Session (2026-11-17, tenth request, read-only)


- User request: confirm that elements placed on the canvas are restricted and cannot be moved around the canvas area.
- Finding: confirmed. A mouse press on the canvas only selects; there is no drag-to-move. Resize handles change only width/height. Tested with a real mouse drag in a browser, both in normal flow and with `position:absolute`: nothing moved. Details and the ways to move or place elements that do work (Alt+Up/Down, Layers drag, Position and Inset fields) are in `TEST_RESULTS.md`.
- No application code changed. No tests run.
- Next action: wait for the user's decision. If they ask for drag-to-move on the canvas, that is a new feature request (design choices such as free-positioning with `position:absolute` versus reordering in the flow should be settled by the user). Do not merge into `main`.

## Earlier Session (2026-11-17, ninth request, rejected and reverted)


- User request: confirm that layout elements such as header and footer already contain content, and remove it so every element opens blank.
- Confirmed and implemented (commit `3c86e45`): `make()` in `renderer/app.js` cleared starter text and children.
- Result: rejected by the user ("Reject. i wish to leave the prefilled elements as it is"). Reverted by restoring `renderer/app.js`, `main/tools.js` and `test/e2e.js` to commit `c9739fc`; the starter content (header "Brand"/"Menu", footer "© Your company" and the rest) is back. The history keeps both commits; nothing was force-pushed.
- Tests after the revert: `node test/e2e.js` gives 144 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`).
- Not run: real Electron window testing and `test/main-smoke.js`.
- Next action: wait for the user's next instruction. Do not merge into `main`.

## Earlier Session (2026-11-17, eighth request, approved)


- User request: on the branch that is not `main`, make the viewport display values look like the supplied screenshot (`400 ⬍ × 512 ⬍`). `feature/ai-development-workflow` is the only non-main branch.
- Done in `renderer/index.html`: `#vw` and `#vh` are `type="number"` with min/max/step; the "W" and "H" spans are removed.
- Done in `renderer/styles.css`: `.dim input` is 60px wide, right-aligned; the spinner arrows are always visible (`::-webkit-inner-spin-button` opacity 1).
- Not changed: `renderer/app.js` (existing `input` / `change` / Enter handlers and limits still apply).
- Tests: `node test/e2e.js` gives 144 passed, 3 failed (the same 3 as before: `get_window_state`, `get_app_state`, `get_process_info`). Verified the footer in a browser screenshot.
- Not run: real Electron window testing and `test/main-smoke.js`. The user must test it.
- Result: approved by the user on 2026-11-17 (commit `c0f0570`, pushed). Do not merge into `main`.

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
- Clicking an element in the Elements tab adds it after the selected element (not inside it). Parts that need a parent (li, td, option, source and similar) go inside a valid selected parent. Nothing enforces valid nesting for drag-and-drop.
- Elements carry more inline CSS than before, so Copy page code is longer.
- Properties added through search (other than the margin and padding sides) show under "Custom properties", not next to related fields.

## Next Action

Wait for the user to test dragging positioned elements on the canvas and say `APPROVE` or `REJECT`. A separate approval is required before merging into `main` or releasing the application.

## Approval Status

Awaiting User Approval (drag positioned elements on the canvas). Rejected and reverted on 2026-11-17: add every element blank. Approved on 2026-11-17: viewport number spinner fields and the device size dropdown. Earlier tasks (SVG / Drawing removal, add missing elements, browser-default styles, CSS tab gaps with margin and padding per-side fields, window sizing fix) were approved by the user.

> Note: No approval here authorizes merging into `main` or releasing the application.

## 2026-11-20 — Delete message, rail tabs, in-app save chooser (Awaiting User Approval)

- Native file windows replaced by an in-app chooser (`#fbDlg`, `chooseLocation()` in renderer/app.js); main/main.js `fb:*` IPC validates paths; save/export/open return `{needLocation:true}` to trigger it.
- `+` on a fresh desktop project saves first (`addPageAsked`). Page delete uses `#pgDel` when the project has unsaved changes.
- Rails: `.rtab[data-rail]` buttons set S.ltab/S.rtab then expand the panel.
- Not tested on real Windows/Electron; only the browser stand-in.
