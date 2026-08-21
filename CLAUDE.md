# CLAUDE.md — storyblok-filerobot

## Project Overview

A **Storyblok Field Plugin** that integrates **Filerobot** (Scaleflex's DAM) as a custom field type.
Content editors use it to select, manage, and preview digital assets (images, video, audio, documents) from
Filerobot directly inside the Storyblok visual editor.

Stored field value is a **JSON array** of `File` objects saved via `plugin.actions.setContent()`.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Vue 3.2 (Composition API, `<script setup>`) |
| Language | TypeScript 5.6 (strict mode) |
| Build | Vite 5.4 + `vue-tsc` |
| CSS bundling | `vite-plugin-css-injected-by-js` (CSS embedded in JS output) |
| Output format | CommonJS (required by Storyblok field plugin CLI) |
| Plugin SDK | `@storyblok/field-plugin` 1.4.1 |
| Drag & drop | `vue-draggable-next` |
| Script loader | `vue-plugin-load-script` |
| Tests | Vitest 2.1 + @testing-library/vue + jsdom |

The `react` / `react-dom` entries in `package.json` are unused — do not add React code.

---

## Commands

```bash
npm run dev       # Dev server on http://localhost:8080
npm run build     # Type-check (vue-tsc) then bundle to dist/
npm run test      # Run Vitest unit tests
npm run preview   # Preview the production build locally
npm run deploy    # build + npx @storyblok/field-plugin-cli deploy
```

---

## Source Structure

```
src/
├── main.ts                          # Entry point
├── App.vue                          # Root component (wraps FieldPlugin)
├── style.css                        # Global CSS variables / design tokens
└── components/FieldPlugin/
    ├── index.vue                    # MAIN component — all asset management logic
    ├── Filerobot.vue                # Loads & configures the Filerobot Explorer widget
    ├── ModalToggle.vue              # "Add Assets" / "Refresh Assets" buttons
    ├── PreviewModal.vue             # Full-screen asset preview (zoom, pan, nav, metadata)
    ├── usePreviewState.ts           # Cross-iframe preview state via localStorage
    ├── useSettingsStore.ts          # Fetches metadata field mappings from Filerobot API
    └── index.css                    # All component styles (655 lines)
```

---

## Component Responsibilities

### `index.vue` — Core orchestrator
- Reads plugin options (`token`, `secTemplate`, `rootDir`, `limit`, `limitType`, `attributes`, `metaData`) from `plugin.data.options`
- Validates required options (token + secTemplate + rootDir); shows config error if missing
- Calls Filerobot REST API (`https://api.filerobot.com/{token}/v5/files/{uuid}?format=select:human`) to hydrate selected file metadata
- Assembles `File` objects and persists via `plugin.actions.setContent()`
- Renders thumbnail grid with drag-to-reorder (`VueDraggableNext`)
- Handles limit enforcement (`limit` = max count, `limitType` = MIME category filter)
- Manages `currentFile` / `currentFileIndex` for preview navigation

### `Filerobot.vue` — Widget integration
- Dynamically loads `scaleflex-widget.min.js` from CDN when the modal opens
- Initialises `ScaleflexWidget.Core` with the plugin options
- Passes `filters.mimeTypes` (from `limitType`) and optional `forceFilters` (metadata filter JSON with `$CURRENT_DATE` substitution)
- Emits `export` event → calls `props.selectedFiles()` back into `index.vue`

### `PreviewModal.vue` — Asset preview
- Shows when `plugin.data.isModalOpen && isPreviewMode`
- Image: zoom (0.5×–5×, step 0.25×), pan (mouse drag), scroll wheel zoom
- Video / audio: native `<video>` / `<audio>` controls
- Documents: file icon + extension label
- Sidebar: Format, Type, Owner, UUID, Name, Attributes (with HTML escaping), meta fields resolved via `getFieldTitle()`
- Navigation arrows (prev/next) emit `navigate` event to parent

### `ModalToggle.vue` — Action buttons
- "Add Assets" disabled when limit reached
- "Refresh Assets" re-fetches CDN URLs for all stored files

### `usePreviewState.ts`
- `isPreviewMode` (ref) — controls whether the preview or the widget is shown
- `setPreviewMode(val, index?)` — writes to `localStorage` for cross-iframe sync
- `getSavedPreviewIndex()` — restores current asset index after iframe reload

### `useSettingsStore.ts`
- `fetchSettings(token)` — calls Filerobot Settings API to get metadata field definitions
- `getFieldTitle(key)` — returns the human-readable label for a metadata key

---

## Plugin Configuration Options

Configured in **Storyblok → Field Plugin → Options**:

| Option | Required | Description |
|---|---|---|
| `token` | Yes | Filerobot container token |
| `secTemplate` | Yes | Security template ID |
| `rootDir` | Yes | Root folder path in Filerobot |
| `limit` | No | Max number of assets (0 = unlimited) |
| `limitType` | No | Comma-separated MIME categories: `image`, `video`, `audio`, `document` |
| `attributes` | No | Comma-separated file attributes to store, e.g. `meta[field1,field2],tags,info` |
| `metaData` | No | Metadata field configuration |
| `forceFilters` | No | JSON string for metadata filters, supports `$CURRENT_DATE` variable |
| `assetPickerConfig` | No | JSON string to override asset picker config. Defaults: `{"multiSelect":true,"showMetadata":true,"rememberLastTab":true,"rememberLastFolder":true,"rememberLastView":true}` |

---

## File Object Schema

The stored field value is an array of objects matching this interface:

```ts
interface File {
  uuid: string        // "{original_uuid}_{index}" — index prevents duplicates
  name: string
  type: string        // MIME type, e.g. "image/webp"
  extension: string
  source: string      // always "filerobot"
  cdn: string         // CDN URL (vh param stripped)
  ownerName: string
  attributes?: any    // optional — present when plugin option 'attributes' is set
}
```

UUID format `{uuid}_{index}` is intentional — `index` is `files.length + filePosition` to avoid collision when adding multiple files at once.

---

## Key Patterns

### API call flow when selecting assets
1. Filerobot widget fires `export` event with raw file objects
2. `selectedFiles()` in `index.vue` maps each to `fetchfileData(uuid)` (parallel with `Promise.all`)
3. Response merged into `File` shape; `force_format` URL param overrides type/extension
4. `updatFiles()` applies limit slicing and `limitType` filtering, then calls `setContent()`

### CDN URL handling
- `removeURLParameter(url, 'vh')` strips the expiring `vh` param on every URL before storage
- `createThumbnail(url)` appends `width=55&height=55` for the grid thumbnails
- `createReviewImage(url)` appends `width=350` for inline preview
- `getPreviewUrl(url)` sets `width=800` for the modal preview

### `attributes` option parsing
- Format: `meta[field1,field2],tag,info` — `meta[...]` is special and maps to `file.meta`
- `extractAndRemoveMeta()` splits off the `meta[...]` group; remaining comma-separated keys map directly to file properties
- `filterObjectByKeys()` picks only specified keys from the meta object

### Force filters `$CURRENT_DATE`
`convertForceFilters()` in `Filerobot.vue` replaces every `$CURRENT_DATE` token with today's date (`YYYY-MM-DD`) before JSON-parsing the filter string.

---

## Build Output

`dist/` contains a single `index.js` (CommonJS) with CSS embedded.
No separate CSS file is emitted — this is required for Storyblok field plugin deployment.

---

## Testing

Tests live in `src/components/FieldPlugin/index.spec.ts`.
Setup file: `src/setupTests.ts` (runs `cleanup` after each test).
Run with `npm run test` (Vitest, jsdom environment).

---

## CDN Widget Versions

The Filerobot Explorer widget is loaded from:
```
https://scaleflex.cloudimg.io/v7/plugins/widget/v4/latest/scaleflex-widget.min.js
https://scaleflex.cloudimg.io/v7/plugins/widget/v4/latest/scaleflex-widget.min.css
```

`latest` always pulls the newest `v4` release. Pin a specific version by replacing `latest` with a version tag when needed (see commit `ea5cd2a` for precedent).

---

## Deployment

```bash
# Requires STORYBLOK_PERSONAL_ACCESS_TOKEN in .env or environment
npm run deploy
```

Uses `@storyblok/field-plugin-cli` to upload the built `dist/index.js` to Storyblok.
