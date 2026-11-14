# Development Mode

This document describes how to run NexusStudio directly from source for development and testing.

## Quick Start

```bash
# Install dependencies (only needed once)
npm install

# Run the app in development mode
npm start
```

This launches the Electron app with the renderer loaded from `renderer/` directly — no build step required.

## Development Workflow

```
edit source (renderer/ or main/)
    ↓
run `npm start` (or just refresh if already running)
    ↓
test in the running app
    ↓
modify
    ↓
test again
```

**No rebuilding or reinstalling the Windows `.exe` is needed after source modifications.**

## Running Tests

### Main Process Smoke Tests
```bash
node test/main-smoke.js
```
Runs 20+ tests against a stand-in Electron environment. Tests the MCP server, tool registration, and main process logic.

### End-to-End Editor Tests
```bash
npm test
```
Runs Playwright tests against a real browser instance. Tests the editor UI, element manipulation, and MCP tool integration.

### All Tests
```bash
node test/main-smoke.js && npm test
```

## Test Data Isolation

Development/test data is separated from normal user data:

- The app uses `app.getPath('userData')` for persistent data
- In development, this points to a separate directory from the installed app
- Test runs use temporary directories that are cleaned up automatically
- Your normal NexusStudio projects are never touched during development

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXUS_DEV` | Set to `1` to enable development-only features |
| `NEXUS_TEST_PORT` | Override the MCP server port for testing |

## Debugging

### Renderer Process (Editor)
- Open DevTools with `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS)
- Console logs are also available via the `get_console_logs` MCP tool

### Main Process
- Run with `NEXUS_DEV=1 npm start` to see main process logs in the terminal
- The MCP server logs all requests at debug level

## Adding New Tools

1. Add the tool definition to `main/tools.js`
2. Implement the handler in `renderer/app.js` as `API.<toolName>`
3. Add the tool name to the `raw` list in `renderer/app.js` (for read-only tools)
4. Test via MCP or the AI panel in the app

## Project Structure

```
main/           # Electron main process
  main.js       # Entry point, window creation, MCP server
  tools.js      # Tool definitions for AI assistants
  mcp-server.js # MCP HTTP server
renderer/       # Editor (plain HTML/CSS/JS, no build)
  index.html    # Main HTML
  app.js        # Editor logic + API implementations
  styles.css    # Editor styles
mcp/            # MCP stdio bridge for Claude Desktop
test/           # Test suite
  main-smoke.js # Main process tests
  e2e.js        # Playwright E2E tests
tools/          # Build scripts
```

## Building the Installer

```bash
npm run dist
```
Creates `dist/NexusStudio-Setup-<version>.exe` using electron-builder.

This is only needed for distribution — not for development.