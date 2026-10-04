# Omarchy Theme Editor

**English** | [Türkçe](README.tr.md)

A browser-based editor for creating, previewing and downloading Omarchy themes. Built with React, TypeScript and Vite, with English (default) and Turkish interfaces. No server, account or cloud storage is required.

I love Omarchy! I made this project to make it easier to create my own themes and share them with the Omarchy community. ❤️

![The app’s desktop preview using the Tokyo Night theme](docs/images/desktop-preview.png)

The screenshot shows only the app’s desktop preview: a browser-rendered representation for trying out themes.

## Getting started

Use Node.js 22.12+ or a newer version supported by Vite.

```sh
git clone https://github.com/c0detnr/omarchy-theme-editor.git
cd omarchy-theme-editor
npm ci
npm run dev
```

Open the address printed in your terminal. To build and preview the production version:

```sh
npm run build
npm run preview
```

The `dist/` directory can be served by any static web server. Fonts and preset palettes are bundled; the app does not fetch external fonts or images at runtime.

## Features

- Live desktop preview with a terminal, code editor, file manager, application menu and notification.
- Tokyo Night, Catppuccin Latte, Nord, Gruvbox and Rose Pine starting palettes.
- Custom color picker, theme palette shortcuts and `#RRGGBB` inputs for semantic, surface and terminal colors. Invalid HEX input preserves the last valid color.
- PNG, JPEG and WebP backgrounds, preserving their original bytes.
- Yaru icon color previews. Actual system icon files are not loaded into the browser.
- TOML and ZIP import/export, including legacy color names.
- Undo/redo with up to 60 changes and `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`. Text inputs keep their native editing history.
- Automatic local saving through IndexedDB, including background images. Editing and downloads still work if saving fails.
- Responsive editing and preview panels, with a remembered English/Turkish language choice.

Click a color swatch to open its picker. Drag the color area or hue slider, use keyboard arrows, choose a palette shortcut or enter a HEX value. **Initial** restores the color from when the picker opened; Escape or an outside click closes it.

Light/dark mode changes the theme’s `mode` metadata; it does not invert colors. The bundled Rose Pine palette uses light colors. Changes in separate tabs are not merged.

## Import

Import a `.toml` file or a `.zip` containing `colors.toml` at the root or inside one top-level folder. TOML is parsed with **smol-toml**. Semantic fields and legacy names such as `color0…color15` and `bg/fg` are resolved using Omarchy-compatible precedence and shade generation.

Required base colors are `accent`, `background`, `foreground`, `red`, `green`, `yellow`, `blue`, `magenta` and `cyan`; their supported legacy equivalents also work.

ZIP imports read `colors.toml`, `icons.theme` and supported images under `backgrounds/`. Unrecognized fields and other files are listed in the import report and omitted from exports. Unsupported icon sets fall back to the default with a warning. Invalid TOML, colors, required fields or images leave the current work intact.

Limits: 100 MiB ZIP file, 100 MiB decompressed archive, 1 MiB TOML, 4,096 archive entries and 99 MiB total uploaded backgrounds. Unsafe paths, duplicate entries, encrypted archives, invalid CRC32 checksums and inconsistent records are rejected. Classic ZIP stored/deflate methods are supported; ZIP64 and multipart archives are not.

## Export and install

**Download colors.toml** exports colors and mode, plus a JSON comment storing the editor’s theme name, slug and icon choice. Omarchy ignores this comment. TOML does not include images.

**Download theme ZIP** exports:

```text
<theme-slug>/
  colors.toml
  icons.theme
  backgrounds/  # Original uploaded images, if any
```

The metadata comment also preserves the selected background. Reimporting a ZIP restores colors, mode, icons, background selection and original image bytes.

The folder name must match `[a-z0-9_][a-z0-9._+-]*` and be at most 100 characters long. Display names can contain Turkish characters; the folder name is generated automatically and can be edited in the export dialog.

Extract the ZIP and place the theme folder under `~/.config/omarchy/themes/`, then select it from Omarchy’s theme menu. For a TOML-only export, create the theme folder and place `colors.toml` inside it. Omarchy generates application settings from the palette.

The editor does not modify local system settings. Applying themes directly, importing from GitHub URLs, editing `shell.toml`, accounts and cloud storage are outside its current scope.

## Development

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Browser tests use Chromium at `/usr/bin/chromium`. Override it with `CHROMIUM_PATH=/path/to/chromium npm run test:e2e`. The test server uses port 5174; visual test artifacts are written to `artifacts/`.

- `src/theme/model.ts`: document, palette, folder-name and size rules.
- `src/theme/resolve.ts`: semantic color resolution and legacy aliases.
- `src/theme/io.ts`, `zip.ts`, `images.ts`: file import/export and image validation.
- `src/theme/storage.ts`, `history.ts`, `useEditor.ts`: persistence and undo/redo.
- `src/components/`: editor controls and theme-driven desktop preview.
- `src/i18n.tsx`, `translations.ts`: English/Turkish language support.
- `src/theme/palettes/`: bundled starting palettes from Omarchy’s `quattro` branch.

## Credits

Made with love for [Omarchy](https://omarchy.org/), an independent community project.

Format references: [Omarchy theme documentation](https://omarchy.org/manual/making-your-own-theme/), [color resolver](https://github.com/omacom/omarchy/blob/quattro/bin/omarchy-theme-color) and [theme palettes](https://github.com/omacom/omarchy/tree/quattro/themes).

Built with [React](https://react.dev/), [Vite](https://vite.dev/), [react-colorful](https://github.com/omgovich/react-colorful), [fflate](https://github.com/101arrowz/fflate), [smol-toml](https://github.com/squirrelchat/smol-toml) and [Lucide](https://lucide.dev/).
