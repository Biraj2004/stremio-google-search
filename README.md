<div align="center">

<img src="./chrome/images/icon_128x128.png" alt="Stremio Google Search Logo" width="96" height="96" />

# Stremio Google & DuckDuckGo Search

**One-click streaming shortcuts injected directly into your search results.**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=flat-square)](./package.json)
[![Manifest V3](https://img.shields.io/badge/manifest-v3%20(Chrome)-informational?style=flat-square)](./chrome/manifest.json)
[![Manifest V2](https://img.shields.io/badge/manifest-v2%20(Firefox)-informational?style=flat-square)](./firefox/manifest.json)
[![Tests](https://img.shields.io/badge/tests-13%20passing-brightgreen.svg?style=flat-square)](./test/extension.test.js)
[![Linter](https://img.shields.io/badge/web--ext%20lint-0%20warnings-brightgreen.svg?style=flat-square)](./firefox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-browser-support">Browser Support</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-development-workflow">Development</a> •
  <a href="#-license">License</a>
</p>

</div>

---

## 📖 Overview

**Stremio Google Search** seamlessly connects your everyday web searches with your local [Stremio](https://www.stremio.com/) media library. When you search for any film or television show on **Google** or **DuckDuckGo**, the extension inspects the page for recognized IMDb identifiers (`tt\d+`) and instantly injects a native-feeling **"Watch on Stremio"** action button.

If streaming options are already shown by the search engine, Stremio appears alongside existing providers (Netflix, Prime Video, Apple TV, etc.). If no native streaming cards exist, an unobtrusive floating button appears at the bottom of the viewport so you can launch the title in Stremio with a single click.

---

## ✨ Features

- 🎬 **Native Media Action Integration**: Adds a styled Stremio button directly into Google's "Ways to watch" panel without displacing existing providers.
- 🦆 **DuckDuckGo Quick Links**: Hooks into DuckDuckGo's sidebar knowledge cards to insert a Stremio link directly in the quick links section.
- 🎯 **Floating Action Button (FAB) Fallback**: Displays a clean, non-intrusive floating button if standard search cards are absent or minimized.
- ⏱️ **Dismissal Gesture**: Long-press or click-and-hold the floating button for 1 second to dismiss it if it gets in the way.
- ⚡ **SPA & Dynamic Navigation Ready**: Monitors DOM mutations using a debounced observer to ensure results are detected during client-side search query transitions without page refreshes.
- 🔒 **Secure & AMO-Compliant**: Zero `innerHTML` string parsing, strict DOM sanitization, and full adherence to Mozilla's built-in data collection consent guidelines.
- 📱 **Mobile & Desktop Views Supported**: Adapts layout smoothly whether viewed on desktop screens or mobile viewports.

---

## 🌐 Browser Support

| Browser | Manifest Version | Engine | Status |
| :--- | :---: | :--- | :---: |
| **Google Chrome** | V3 | Chromium | ![Ready](https://img.shields.io/badge/Ready-brightgreen?style=flat-square) |
| **Brave Browser** | V3 | Chromium | ![Ready](https://img.shields.io/badge/Ready-brightgreen?style=flat-square) |
| **Microsoft Edge** | V3 | Chromium | ![Ready](https://img.shields.io/badge/Ready-brightgreen?style=flat-square) |
| **Opera / Vivaldi** | V3 | Chromium | ![Ready](https://img.shields.io/badge/Ready-brightgreen?style=flat-square) |
| **Mozilla Firefox** | V2 | Gecko | ![Ready](https://img.shields.io/badge/Ready-brightgreen?style=flat-square) |

---

## 🚀 Installation

### Chromium Browsers (Chrome, Brave, Edge, Opera)

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/your-username/stremio-google-search.git
   ```
2. Open your browser's extension management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
3. Toggle **Developer mode** on (typically in the top-right corner).
4. Click **Load unpacked**.
5. Select the [`chrome`](./chrome) directory from this repository.
6. Open Google or DuckDuckGo and search for a movie (e.g. *Interstellar* or *Breaking Bad*).

### Mozilla Firefox

1. Open Firefox and navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Click **Load Temporary Add-on...**.
3. Select [`firefox/manifest.json`](./firefox/manifest.json).
4. The extension is now active in Firefox.

---

## 🔍 How It Works

```text
[ Search Page (Google / DDG) ]
             │
             ▼
    Extract IMDb ID (tt\d+)
             │
     ┌───────┴───────┐
     ▼               ▼
[ Found ]       [ Not Found ]
     │               │
     ▼               ▼
Inspect Page    Do Nothing
Structure
     │
     ├─► Watch Options Row Exists ──► Prepend Stremio CTA button
     ├─► DuckDuckGo Quick Links   ──► Insert into quick-links list
     └─► Standalone Search Result ──► Fallback to Floating Action Button (FAB)
```

1. **Detection**: Upon page idle or DOM update, [`shared/scripts/script.js`](./shared/scripts/script.js) scans for anchor tags referencing `imdb.com/title/tt*`.
2. **Classification**: Detects content type (`movie` vs `series`) based on page metadata or television schema markers.
3. **Deep Linking**: Formats a Stremio application URI:
   ```text
   stremio:///detail/{contentType}/{imdbCode}
   ```
4. **Rendering**:
   - On desktop Google: prepends an action card containing the Stremio logo and tagline.
   - On DuckDuckGo: clones and inserts an item into the "Quick links" bar.
   - On minimal results: spawns an unobtrusive `#floating-btn` with auto-hide behavior on scroll down.

---

## 🛠️ Development Workflow

The project uses a unified [`shared`](./shared) folder for source scripts and styles, which are copied to the browser-specific target folders during build or sync.

### File Structure

```
├── shared/              # Primary source files (edit here)
│   ├── scripts/
│   │   └── script.js    # Content script
│   └── styles/
│       └── styles.css   # Injected stylesheet
├── chrome/              # Chrome Manifest V3 distribution
│   ├── manifest.json
│   ├── images/
│   ├── scripts/
│   └── styles/
├── firefox/             # Firefox Manifest V2 distribution
│   ├── manifest.json
│   ├── images/
│   ├── scripts/
│   └── styles/
├── test/                # Automated test suite
│   └── extension.test.js
├── extensions/          # Packaged zip archives for each variation
│   ├── stremio-google-search-chrome-v2.0.0.zip   # Contains stremio-google-search-chrome-v2.0.0/
│   └── stremio-google-search-firefox-v2.0.0.zip  # Contains stremio-google-search-firefox-v2.0.0/
├── sync.js              # Node.js cross-platform sync runner
├── sync.ps1             # PowerShell sync script
├── sync.sh              # Bash sync script
├── build.js             # Zip packaging script
├── package.json
└── LICENSE              # MIT License
```

### Common Commands

Always make edits in [`shared/`](./shared), then run the following commands:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Sync Files** | `npm run sync` | Copies `shared/` contents to `chrome/` and `firefox/` |
| **Run Tests** | `npm test` | Runs the test suite via Node.js native test runner |
| **Lint Extension**| `npm run lint` | Runs official `web-ext lint` on the Firefox add-on |
| **Build Releases**| `npm run build` | Synchronizes files and outputs ready-to-publish `.zip` files in `extensions/` |

---

## 🧪 Testing

The repository includes automated unit and integration tests powered by Node's built-in `node:test` framework:

```bash
npm test
```

Tests verify:
- ✅ **Manifest Validity**: Checks JSON syntax, required keys, icon files, and Gecko permissions.
- ✅ **Sync Integrity**: Verifies exact byte matching between `shared/`, `chrome/`, and `firefox/`.
- ✅ **IMDb Parsing**: Validates title extraction across desktop, mobile, and redirected URLs.
- ✅ **DOM Injections**: Tests button creation, CTA styling, duplicate prevention, and fallback FAB triggering.
- ✅ **Interaction Handlers**: Tests long-press timer dismissal and scroll-hiding mechanisms.

---

## 📄 License

This project is open-source software licensed under the **[MIT License](./LICENSE)**.
