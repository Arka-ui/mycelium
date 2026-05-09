# Mycelium examples

Drop-in starter content for the beta.

## Themes

`themes/*.json` are full custom themes. To install:

1. Open Mycelium -> sidebar cog (Settings) -> **Themes** tab.
2. Click **Import from JSON...** and choose one of the files.
3. The theme appears in the list. Click **Use** to switch to it.

You can also click any imported theme and **Edit** to tweak the colours.

| File | Description |
|---|---|
| `themes/solarized-dark.json` | Ethan Schoonover's Solarized palette, dark variant. |
| `themes/nord.json` | Nord palette, dark variant. |

## Plugins

`plugins/*.json` are bundled plugin manifests + source. To install:

1. Open Mycelium -> sidebar cog (Settings) -> **Plugins** tab.
2. Click **+ Install plugin from JSON...** and choose one of the files.
3. Click **Enable** next to the plugin.
4. Open or save a note and watch the dev console (`F12` -> Console) to see the plugin react.

| File | Description |
|---|---|
| `plugins/word-count.json` | Logs word and character count to the console on every save. |

## Plugin format

A plugin bundle is a single JSON file with two top-level keys:

```json
{
  "manifest": {
    "id": "my-plugin",
    "name": "My plugin",
    "version": "1.0.0",
    "author": "Your name",
    "description": "What it does",
    "homepage": "https://...",
    "entry": "index.js",
    "permissions": ["note:read", "note:write"]
  },
  "code": "// JavaScript source string. Runs in a Web Worker sandbox."
}
```

The runtime injects a global `mycelium` API:

```js
mycelium.on('note:created', note => { /* note { id, title, body, ... } */ });
mycelium.on('note:opened', note => { /* ... */ });
mycelium.on('note:saved',  note => { /* ... */ });
mycelium.on('note:deleted', { id } => { /* ... */ });

mycelium.command('my-cmd', ctx => {
  // ctx.note - active note (read-only copy)
  // returned value goes back to the host
});

mycelium.log('anything');  // shows in dev console with [plugin <id>] prefix
```

The Worker has no DOM, no fetch, no filesystem. It can only react to events and register commands. This sandbox is the M0 plugin environment; Wasm-based plugins with the full WIT contract land in beta.3.
