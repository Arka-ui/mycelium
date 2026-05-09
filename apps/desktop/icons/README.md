# Application icons

Tauri's bundle configuration (`apps/desktop/tauri.conf.json`) expects:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`  (256x256 retina)
- `icon.icns`       (macOS)
- `icon.ico`        (Windows)

These are not yet authored. M0 builds in dev mode (`cargo tauri dev`) which does not require icons; release packaging (`cargo tauri build`) will fail without them.

To generate the icon set from a single source PNG (≥ 1024×1024) once one exists:

```powershell
cargo tauri icon path\to\source.png --output apps\desktop\icons
```

The Tauri CLI auto-derives every required size and format from a single high-resolution source.

## Design brief

Per `../../../docs/MYCELIUM.md` §1, the project name comes from the underground network of fungal threads connecting trees in a forest. The icon should evoke this: organic, branching, decentralized. Subtle — not a literal mushroom.

Color: a single accent (the project will pick during M3 polish), neutral background.

Style: flat, scalable, recognizable at 16×16.
