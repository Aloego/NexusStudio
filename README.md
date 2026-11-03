# NexusStudio

A visual web page editor for Windows 11. You build a page by clicking, dragging and typing,
and an AI assistant such as Claude can edit the same page for you through MCP.

## 1. Get the installer

You need to build the installer once. Pick one way.

### Way A: on your Windows PC (about 10 minutes)

1. Unzip this folder somewhere easy, for example your Desktop.
2. Install Node.js: open https://nodejs.org, download the **LTS** version and install it with the default options.
3. Double-click **build-windows.bat** in this folder.
4. When it finishes, a folder called **dist** opens. It holds **NexusStudio-Setup-1.0.0.exe**.

If the window ends with "Cannot create symbolic link", open Settings, System, For developers,
turn on **Developer Mode**, then double-click build-windows.bat again.

### Way B: on GitHub (no installs on your PC)

1. Create a new private repository on GitHub.
2. Upload everything from this folder, including the hidden **.github** folder.
3. Open the **Actions** tab, choose **Build Windows installer**, press **Run workflow**.
4. When it turns green (about 5 minutes), open the run and download **NexusStudio-Windows-Installer**.

## 2. Install and open

Double-click NexusStudio-Setup-1.0.0.exe. Windows may show a blue "Windows protected your PC" box
because the installer is not signed by a paid certificate. Press **More info**, then **Run anyway**.
The installer is made from the files in this folder, so there is nothing hidden in it.

NexusStudio then appears in your Start menu and on your Desktop.

## 3. Use the editor

- **Elements** (left): click an item to add it, or drag it onto the page.
- **Click** anything on the page to select it. **Double-click** text to type. Drag the square handles to resize.
- **Properties** (right): change spacing, colours, text, layout and more. Use the search box for any CSS property.
- **Layers** (left tab): the page as a tree. Drag to reorder or nest.
- **HTML, CSS, JavaScript, Preview** (bottom): see the code, add your own, and run the page for real.
- **File menu**: Open and Save projects (Ctrl+O, Ctrl+S), import an HTML file, export the finished page.
- **Ctrl+Z** undoes anything, including what the AI did.

Your work is also kept as a draft automatically, so closing the window does not lose it.

## 4. Let an AI edit your page

NexusStudio runs a small server that listens **only on your own computer** and needs a secret key.
Open it from the **AI** button at the top.

### Claude Desktop

1. Click **AI** at the top of NexusStudio, then **Add to Claude Desktop**.
2. Close Claude Desktop completely (right-click its tray icon, Quit) and open it again.
3. Start a chat and say, for example: "Open my NexusStudio page and make the hero section more welcoming."

Claude can start NexusStudio by itself if it is closed.
If Claude Desktop was installed from the Microsoft Store, its settings file is in a different place.
Use **Copy config instead** and paste it into Claude Desktop under Settings, Developer, Edit Config.

### Claude Code and other MCP tools

Click **AI**, then **Copy command**, and paste it into a terminal. It looks like this:

    claude mcp add --transport http nexusstudio http://127.0.0.1:39517/mcp --header "Authorization: Bearer YOUR-KEY"

### What the AI can do

Read the page and its code, find elements, add / change / move / copy / delete elements,
add HTML, set styles, custom CSS and JavaScript, change the page size, undo and redo,
take a screenshot to check its own work, and group many edits into one step you can undo with a single Ctrl+Z.
It cannot read or write other files on your computer.

### Safety

- The server only accepts connections from your own computer, and only with the secret key.
- Web pages in your browser cannot talk to it.
- Scripts and iframes the AI tries to add to the editing canvas are dropped. Scripts you write yourself run only in Preview and in the exported page.
- Turn the server off any time in the AI window.

## 5. Troubleshooting

| Problem | What to do |
| --- | --- |
| AI says NexusStudio is not running | Open NexusStudio, then ask again. |
| AI stopped working after a Windows update | Open the AI window and press **Add to Claude Desktop** again, then restart Claude Desktop. |
| Port already in use | NexusStudio picks another port by itself. Press **Add to Claude Desktop** again. |
| Fonts look plain | The built-in fonts load from the internet when you are online. Offline, Windows fonts are used. |

## For developers

    npm install          # electron + electron-builder
    npm start            # run the app
    npm run dist         # build dist/NexusStudio-Setup-<version>.exe
    npm i -D playwright && npm test    # editor + MCP tests in a real browser
    node test/main-smoke.js            # main-process tests with a stand-in Electron

- `renderer/` the editor (plain HTML, CSS, JS, no build step)
- `main/` Electron main process, the MCP server (`mcp-server.js`) and the tool list (`tools.js`)
- `mcp/stdio-bridge.js` lets stdio-only apps such as Claude Desktop reach the server
- Adding a tool: describe it in `main/tools.js`, then add `API.<name>` in `renderer/app.js`
