'use strict';
// The list of tools an AI assistant sees. Each tool name is also the name of the
// function in renderer/app.js (API.<name>) that does the work, except "screenshot",
// which the main process handles because it needs to capture the window.

const obj = (properties, required) => ({ type: 'object', properties, required: required || [], additionalProperties: false });
const str = (description, extra) => Object.assign({ type: 'string', description }, extra || {});
const num = (description) => ({ type: 'number', description });
const bool = (description) => ({ type: 'boolean', description });
const id = (description) => str(description || 'Element id from get_tree (looks like "n12"). Use "body" for the page itself.');
const position = str('Where to put it relative to the target element.', { enum: ['inside', 'before', 'after'] });
const styleMap = { type: 'object', description: 'CSS properties as {"font-size":"18px","background":"#111"}. Use null as a value to remove a property.', additionalProperties: { type: ['string', 'null'] } };
const attrMap = { type: 'object', description: 'HTML attributes as {"href":"#","alt":"Logo"}. Use null as a value to remove an attribute.', additionalProperties: { type: ['string', 'null', 'boolean'] } };

const TOOLS = [
  {
    name: 'get_document', title: 'Read the whole page',
    description: 'Returns the page title, the body HTML, the custom CSS, the generated CSS and the page script. Start here to see what is on the page.',
    inputSchema: obj({}), readOnly: true
  },
  {
    name: 'get_tree', title: 'Read the element tree',
    description: 'Returns the element tree with ids, tags, text, attributes and inline styles. Ids are needed by every editing tool. Large pages are cut off at max_depth.',
    inputSchema: obj({ id: id('Start from this element. Defaults to the whole page.'), max_depth: num('How many levels to return. Default 6.') }), readOnly: true
  },
  {
    name: 'get_element', title: 'Read one element',
    description: 'Returns one element with its attributes, styles, children and its position and size on the page in pixels.',
    inputSchema: obj({ id: id() }, ['id']), readOnly: true
  },
  {
    name: 'find_elements', title: 'Search for elements',
    description: 'Finds elements by tag, by text they contain, by CSS class or by their id attribute. Returns ids you can edit.',
    inputSchema: obj({ tag: str('Tag name such as "button".'), text: str('Text the element contains (not case sensitive).'), class_name: str('A CSS class the element has.'), id_attr: str('The id attribute of the element.'), limit: num('Maximum results. Default 50.') }), readOnly: true
  },
  {
    name: 'get_selection', title: 'Read what the user selected',
    description: 'Returns the element the person currently has selected in the editor. Use it when they say "this" or "the selected thing".',
    inputSchema: obj({}), readOnly: true
  },
  {
      name: 'select_element', title: 'Select an element',
      description: 'Selects an element in the editor so the person can see it highlighted.',
      inputSchema: obj({ id: id() }, ['id']), readOnly: true
    },
    {
      name: 'get_computed_style', title: 'Get computed styles',
      description: 'Returns the computed CSS styles for an element (including inherited and default values). Useful for verifying actual rendered styles.',
      inputSchema: obj({ id: id(), properties: { type: 'array', description: 'Specific CSS properties to return. If omitted, returns all computed styles.', items: { type: 'string' } } }, ['id']), readOnly: true
    },
    {
      name: 'get_accessibility', title: 'Get accessibility info',
      description: 'Returns accessibility information for an element: role, accessible name, state, and relevant ARIA attributes.',
      inputSchema: obj({ id: id() }, ['id']), readOnly: true
    },
    {
      name: 'get_console_logs', title: 'Get console logs',
      description: 'Returns recent console messages (errors, warnings, logs) from the editor page. Useful for debugging.',
      inputSchema: obj({ level: str('Filter by level: error, warn, log, info, debug.', { enum: ['error', 'warn', 'log', 'info', 'debug'] }), limit: num('Maximum messages to return. Default 50.') }), readOnly: true
    },
    {
      name: 'inspect_element', title: 'Comprehensive element inspection',
      description: 'Returns a complete inspection report for an element: DOM properties, computed styles, accessibility, layout, and interactive state.',
      inputSchema: obj({ id: id() }, ['id']), readOnly: true
    },
    {
      name: 'add_element', title: 'Add an element',
    description: 'Adds one element, optionally with nested children. Example: {"tag":"section","style":{"padding":"48px"},"children":[{"tag":"h2","text":"Pricing"}]}. Elements that need an opening and closing tag may contain children; img, input, hr and br may not.',
    inputSchema: obj({
      tag: str('HTML or SVG tag name, for example div, h1, button, img, svg, rect.'),
      parent_id: id('The element to add next to or into. Defaults to the page.'),
      position, index: num('When position is "inside", the place among the existing children (0 is first). Defaults to the end.'),
      text: str('Text inside the element.'), attrs: attrMap, style: styleMap,
      use_preset: bool('Start from the editor\'s ready-made look for this tag instead of a blank element.'),
      children: { type: 'array', description: 'Nested elements, each with the same fields as this tool (tag, text, attrs, style, children).', items: { type: 'object' } }
    }, ['tag'])
  },
  {
    name: 'add_html', title: 'Add HTML',
    description: 'Parses an HTML snippet and adds it to the page. Inline style attributes become editable styles. Scripts, iframes and stylesheets links are ignored for safety; use set_js and set_css for those.',
    inputSchema: obj({ html: str('The HTML to add.'), parent_id: id('The element to add next to or into. Defaults to the page.'), position, index: num('When position is "inside", the place among the existing children.') }, ['html'])
  },
  {
    name: 'update_element', title: 'Change an element',
    description: 'Changes the text, tag, attributes or styles of one element. Styles and attributes are merged with what is already there; pass null to remove one. On "body" only styles can change.',
    inputSchema: obj({ id: id(), text: str('New text.'), tag: str('New tag name.'), attrs: attrMap, style: styleMap }, ['id'])
  },
  {
    name: 'move_element', title: 'Move an element',
    description: 'Moves an element inside, before or after another element.',
    inputSchema: obj({ id: id(), target_id: id('The element to move next to or into.'), position, index: num('When position is "inside", the place among the children.') }, ['id', 'target_id']), destructive: true
  },
  {
    name: 'duplicate_element', title: 'Duplicate an element',
    description: 'Copies an element and its children and puts the copy right after it.',
    inputSchema: obj({ id: id() }, ['id'])
  },
  {
    name: 'delete_element', title: 'Delete an element',
    description: 'Removes an element and everything inside it. The person can undo this with Ctrl+Z.',
    inputSchema: obj({ id: id() }, ['id']), destructive: true
  },
  {
    name: 'replace_body_html', title: 'Replace the whole page content',
    description: 'Replaces everything inside the page with new HTML. The page body styles (background, font) are kept. Use this to rebuild a page from scratch.',
    inputSchema: obj({ html: str('The new body HTML.') }, ['html']), destructive: true
  },
  {
    name: 'set_css', title: 'Set custom CSS',
    description: 'Sets the custom stylesheet used for rules that inline styles cannot express: hover states, media queries, keyframes, classes.',
    inputSchema: obj({ css: str('CSS text.'), append: bool('Add to the existing custom CSS instead of replacing it.') }, ['css']), destructive: true
  },
  {
    name: 'set_js', title: 'Set the page script',
    description: 'Sets the JavaScript that runs in Preview and in the exported page. It does not run on the editing canvas.',
    inputSchema: obj({ js: str('JavaScript text.'), append: bool('Add to the existing script instead of replacing it.') }, ['js']), destructive: true
  },
  {
    name: 'set_title', title: 'Set the page title',
    description: 'Sets the title shown in the browser tab of the exported page.',
    inputSchema: obj({ title: str('The title.') }, ['title'])
  },
  {
    name: 'get_full_html', title: 'Get the finished HTML file',
    description: 'Returns the complete exported HTML file: head, styles, body and script.',
    inputSchema: obj({}), readOnly: true
  },
  {
    name: 'batch', title: 'Run several edits at once',
    description: 'Runs a list of editing tools in order as one step. If any step fails, none of them are kept. The person can undo the whole batch with one Ctrl+Z. Example: {"operations":[{"tool":"update_element","arguments":{"id":"n4","text":"Hi"}}]}.',
    inputSchema: obj({ operations: { type: 'array', description: 'Steps to run.', items: obj({ tool: str('Any editing tool name except screenshot and batch.'), arguments: { type: 'object' } }, ['tool']) } }, ['operations']), destructive: true
  },
  {
    name: 'new_document', title: 'Start a new page',
    description: 'Throws away the current page and starts a blank page or the sample landing page. The person can undo this.',
    inputSchema: obj({ template: str('"blank" or "sample".', { enum: ['blank', 'sample'] }) }), destructive: true
  },
  {
    name: 'set_viewport', title: 'Change the preview size',
    description: 'Sets the width and minimum height of the page canvas, and the zoom. Use 390 for a phone, 768 for a tablet, 880 or more for a desktop.',
    inputSchema: obj({ width: num('Width in pixels (120 to 10000).'), height: num('Minimum height in pixels.'), zoom: num('Zoom from 0.3 to 2.') })
  },
  {
    name: 'undo', title: 'Undo',
    description: 'Undoes the last change, whether it was made by the person or by an AI.',
    inputSchema: obj({}), destructive: true
  },
  {
    name: 'redo', title: 'Redo',
    description: 'Redoes the change that was just undone.',
    inputSchema: obj({}), destructive: true
  },
  {
      name: 'screenshot', title: 'Take a screenshot',
      description: 'Returns a picture of the editing canvas so you can check how the page looks. Optionally scrolls to an element first.',
      inputSchema: obj({ element_id: id('Scroll this element into the middle of the view first.'), hide_selection: bool('Hide the blue selection box. Default true.') }), readOnly: true
    },
    {
      name: 'get_window_state', title: 'Get window state',
      description: 'Returns information about the NexusStudio window: bounds, size, position, focus state, and whether it is maximized or minimized.',
      inputSchema: obj({}), readOnly: true
    },
    {
      name: 'get_app_state', title: 'Get application state',
      description: 'Returns runtime information about the NexusStudio process: Electron version, platform, memory usage, uptime, and whether the AI server is running.',
      inputSchema: obj({}), readOnly: true
    },
    {
      name: 'get_process_info', title: 'Get process info',
      description: 'Returns information about the current Electron process: process ID, memory usage, CPU usage, and uptime.',
      inputSchema: obj({}), readOnly: true
    }
  ];

module.exports = TOOLS;
