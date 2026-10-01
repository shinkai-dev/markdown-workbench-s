# Changelog

## 1.2.5

- Simplified Preview tab titles to show the binoculars icon and file name without the colon separator.
- Reformatted JavaScript source files for improved readability without changing their behavior.
- Fixed the initial Preview loading sequence so the first document is rendered after the Webview is ready.
- Fixed Markdown rendering and source navigation for list items, including nested, repeated, ordered, and inline-formatted list content.
- Preserved Markdown characters such as underscores, backticks, URLs, and code content during rendering and source matching.
- Improved fenced/indented code handling, nested link/image parsing, and table cell parsing for embedded pipes and alignment.
- Further hardened Markdown rendering for task lists, escaped literals, intraword underscores, raw HTML text, code highlighting, and table action styling.
- Fixed GFM table column splitting when cells contain underscores, emphasis, links, escaped pipes, or inline code, while preserving source-cell mapping.
- Fixed a nested-emphasis parsing regression and source matching for literal triple underscores and raw HTML text.


## 1.2.4

- Fixed sidebar navigation so selected headings are not hidden behind the fixed reading toolbar.
- Added an offset between the selected heading and the fixed toolbar.
- Improved Table of Contents navigation positioning while preserving smooth scrolling.

## 1.2.3

- Improved table cell double-click source navigation for filtered and sorted tables.
- Preserved table row source coordinates so sorting/filtering does not change the original Markdown destination.
- Added a table-row source mapping fallback when a cell-level mapping is unavailable.
- Improved source navigation reliability for large Markdown documents by resolving ordinary Markdown locations lazily on double-click.
- Prevented source-location lookup failures from breaking the rendered preview.
- Avoided unnecessary full preview re-rendering when returning from the Markdown editor without document changes.
- Updated the live preview only after Markdown content changes, with a short debounce during continuous editing.

## 1.2.2

- Fixed Mermaid frames to follow the available VS Code preview width when resized.
- Fixed Mermaid drag positioning so the grabbed diagram moves consistently with the pointer.
- Fixed Markdown source navigation after double-clicking the preview by aligning source mapping with top-level rendered blocks.
- Synced Mermaid frame resize behavior with the browser version.

## 1.2.1

- Fixed Markdown image rendering for relative paths and URLs, including GIF images.
- Fixed image URLs containing `_`, `*`, and other Markdown-significant characters being interpreted as Markdown syntax.
- Integrated the Mermaid frame resize improvements from the browser version.
- Mermaid frame width and height can now be resized independently without resizing the diagram itself.

## 1.2.0

- Integrated the latest browser-version rendering and UI improvements into the VS Code extension.
- Improved Markdown normalization and code block rendering.
- Improved Mermaid rendering, zooming, panning, and fixed-frame behavior.
- Added Mermaid diagram-only view in a separate VS Code editor tab for the selected diagram.
- Improved sidebar default state and open/close behavior.
- Adjusted the VS Code preview maximum width for a more compact workspace.
- Improved Japanese and English UI localization.


## 1.1.1

- Synced the latest browser viewer improvements, including Mermaid pan/zoom behavior and compact table controls.
- Fixed the sidebar so it starts closed and can be opened and closed reliably.
- Added **Open with Markdown Workbench S** to Markdown editor tab context menus.
- Added **Open with Markdown Workbench S** to the preview webview context menu.

## 1.1.0

- Synced the VS Code extension with the latest Markdown Workbench web viewer updates.
- Added improved table filtering and sorting controls.
- Added column copy support.
- Added special table filter conditions and filter summaries.
- Improved code block controls and localized labels.
- Improved Mermaid controls and localization.
- Improved Japanese and English UI coverage.
- Kept the sidebar collapsed by default.
- Preserved double-click preview-to-source navigation.
