const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Mock a lightweight DOM environment for testing script.js
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) { this.classes.add(cls); }
  remove(cls) { this.classes.delete(cls); }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.style = {};
    this.classList = new MockClassList();
    this.eventListeners = {};
    this._textContent = '';
  }

  get id() { return this.attributes.get('id') || ''; }
  set id(val) { this.setAttribute('id', val); }

  get className() { return this.attributes.get('class') || ''; }
  set className(val) { this.setAttribute('class', val); }

  get href() { return this.attributes.get('href') || ''; }
  set href(val) { this.setAttribute('href', val); }

  get src() { return this.attributes.get('src') || ''; }
  set src(val) { this.setAttribute('src', val); }

  get textContent() {
    if (this._textContent) return this._textContent;
    return this.children.map(c => c.textContent).join('');
  }
  set textContent(val) {
    this._textContent = val;
    this.children = [];
  }

  get innerText() { return this.textContent; }
  set innerText(val) { this.textContent = val; }

  get childElementCount() { return this.children.length; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  get firstElementChild() { return this.children[0] || null; }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }

  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newNode, referenceNode) {
    newNode.parentElement = this;
    newNode.parentNode = this;
    const index = this.children.indexOf(referenceNode);
    if (index === -1) {
      this.children.push(newNode);
    } else {
      this.children.splice(index, 0, newNode);
    }
    return newNode;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  dispatchEvent(event) {
    const list = this.eventListeners[event.type] || [];
    for (const h of list) h(event);
  }

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName);
    for (const [k, v] of this.attributes.entries()) {
      clone.setAttribute(k, v);
    }
    clone.textContent = this._textContent;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const traverse = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }
}

function matchesSelector(el, selector) {
  if (selector.startsWith('#')) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith('.')) {
    return el.className.split(/\s+/).includes(selector.slice(1));
  }
  // Attribute selector regex matching tag[attr operator value]
  const attrMatch = selector.match(/^([a-zA-Z0-9]+)?\[([a-zA-Z0-9_-]+)([*^$]?=)?['"]?([^'"\]]+)?['"]?\]/);
  if (attrMatch) {
    const [, tag, attrName, op, val] = attrMatch;
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    const attrVal = el.getAttribute(attrName);
    if (attrVal === null) {
      if (attrName === 'href' && el.tagName === 'A') return false;
      return false;
    }
    if (!op) return true; // presence check e.g. [ping]
    if (op === '=') return attrVal === val;
    if (op === '*=') return attrVal.includes(val);
    if (op === '^=') return attrVal.startsWith(val);
    if (op === '$=') return attrVal.endsWith(val);
  }
  if (selector.toLowerCase() === el.tagName.toLowerCase()) {
    return true;
  }
  return false;
}

class MockDocument extends MockElement {
  constructor() {
    super('DOCUMENT');
    this.body = new MockElement('BODY');
    this.documentElement = new MockElement('HTML');
    this.documentElement.appendChild(this.body);
    this.children = [this.documentElement];
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  evaluate(xpath, contextNode) {
    if (xpath.includes("span[text()='Quick links']")) {
      const spans = contextNode.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent === 'Quick links') {
          return { singleNodeValue: span };
        }
      }
    }
    return { singleNodeValue: null };
  }
}

// Set up globals before requiring script.js
global.XPathResult = { FIRST_ORDERED_NODE_TYPE: 9 };
global.document = new MockDocument();
global.window = {
  location: { hostname: 'www.google.com' },
  scrollY: 0,
  addEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
};
global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
global.chrome = { runtime: { getURL: (p) => `chrome-extension://mock-id/${p}` } };

const scriptModule = require('../shared/scripts/script.js');

describe('Manifest Validation', () => {
  test('chrome/manifest.json is valid Manifest V3 and files exist', () => {
    const content = fs.readFileSync(path.join(__dirname, '../chrome/manifest.json'), 'utf8');
    const manifest = JSON.parse(content);

    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, 'Stremio Google Search');
    assert.ok(manifest.version);

    // Verify icons exist
    for (const size of Object.keys(manifest.icons)) {
      const iconPath = path.join(__dirname, '../chrome', manifest.icons[size]);
      assert.ok(fs.existsSync(iconPath), `Missing icon: ${iconPath}`);
    }

    // Verify content scripts exist
    for (const cs of manifest.content_scripts) {
      for (const js of cs.js) {
        assert.ok(fs.existsSync(path.join(__dirname, '../chrome', js)), `Missing js: ${js}`);
      }
      for (const css of cs.css) {
        assert.ok(fs.existsSync(path.join(__dirname, '../chrome', css)), `Missing css: ${css}`);
      }
    }

    // Verify web accessible resources exist
    for (const war of manifest.web_accessible_resources) {
      for (const res of war.resources) {
        assert.ok(fs.existsSync(path.join(__dirname, '../chrome', res)), `Missing resource: ${res}`);
      }
    }
  });

  test('firefox/manifest.json is valid and files exist with Gecko permissions', () => {
    const content = fs.readFileSync(path.join(__dirname, '../firefox/manifest.json'), 'utf8');
    const manifest = JSON.parse(content);

    assert.equal(manifest.manifest_version, 2);
    assert.equal(manifest.name, 'Stremio Google Search');
    assert.ok(manifest.browser_specific_settings?.gecko?.id);
    assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, {
      required: ['none'],
    });

    for (const size of Object.keys(manifest.icons)) {
      const iconPath = path.join(__dirname, '../firefox', manifest.icons[size]);
      assert.ok(fs.existsSync(iconPath), `Missing icon: ${iconPath}`);
    }

    for (const cs of manifest.content_scripts) {
      for (const js of cs.js) {
        assert.ok(fs.existsSync(path.join(__dirname, '../firefox', js)), `Missing js: ${js}`);
      }
      for (const css of cs.css) {
        assert.ok(fs.existsSync(path.join(__dirname, '../firefox', css)), `Missing css: ${css}`);
      }
    }
  });
});

describe('File Sync Verification', () => {
  test('chrome and firefox scripts are identical to shared scripts', () => {
    const sharedScript = fs.readFileSync(path.join(__dirname, '../shared/scripts/script.js'), 'utf8');
    const chromeScript = fs.readFileSync(path.join(__dirname, '../chrome/scripts/script.js'), 'utf8');
    const firefoxScript = fs.readFileSync(path.join(__dirname, '../firefox/scripts/script.js'), 'utf8');

    assert.equal(sharedScript, chromeScript);
    assert.equal(sharedScript, firefoxScript);
  });

  test('chrome and firefox styles are identical to shared styles', () => {
    const sharedStyles = fs.readFileSync(path.join(__dirname, '../shared/styles/styles.css'), 'utf8');
    const chromeStyles = fs.readFileSync(path.join(__dirname, '../chrome/styles/styles.css'), 'utf8');
    const firefoxStyles = fs.readFileSync(path.join(__dirname, '../firefox/styles/styles.css'), 'utf8');

    assert.equal(sharedStyles, chromeStyles);
    assert.equal(sharedStyles, firefoxStyles);
  });
});

describe('script.js DOM Functions', () => {
  beforeEach(() => {
    global.document = new MockDocument();
  });

  test('getImdbCodeFromDom extracts IMDb code correctly from various URLs', () => {
    const doc1 = new MockDocument();
    const link1 = doc1.createElement('a');
    link1.href = 'https://www.imdb.com/title/tt0816692/';
    doc1.body.appendChild(link1);
    assert.equal(scriptModule.getImdbCodeFromDom(doc1), 'tt0816692');

    const doc2 = new MockDocument();
    const link2 = doc2.createElement('a');
    link2.href = 'https://imdb.com/title/tt1375666/reference';
    doc2.body.appendChild(link2);
    assert.equal(scriptModule.getImdbCodeFromDom(doc2), 'tt1375666');

    const doc3 = new MockDocument();
    const link3 = doc3.createElement('a');
    link3.href = 'https://m.imdb.com/title/tt0903747/';
    doc3.body.appendChild(link3);
    assert.equal(scriptModule.getImdbCodeFromDom(doc3), 'tt0903747');

    const docEmpty = new MockDocument();
    assert.equal(scriptModule.getImdbCodeFromDom(docEmpty), null);
  });

  test('addFabStremio creates floating button and avoids duplicates', () => {
    scriptModule.addFabStremio('movie', 'tt0816692');
    const fab = global.document.getElementById('floating-btn');
    assert.ok(fab, 'Floating button should exist');
    assert.equal(fab.href, 'stremio:///detail/movie/tt0816692');
    assert.equal(fab.getAttribute('aria-label'), 'Watch on Stremio');

    // Call again - shouldn't duplicate
    scriptModule.addFabStremio('movie', 'tt0816692');
    const buttons = global.document.querySelectorAll('#floating-btn');
    assert.equal(buttons.length, 1);
  });

  test('addLongPressListener hides floating button on long press without crashing', async () => {
    const fab = global.document.createElement('a');
    fab.id = 'floating-btn';
    global.document.body.appendChild(fab);
    scriptModule.addLongPressListener(fab);

    // Trigger mousedown to start pressTimer
    fab.dispatchEvent({ type: 'mousedown', button: 0 });

    // Wait for timer (>1000ms)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    assert.equal(fab.style.display, 'none');
  });

  test('addStremioButtonToGoogle injects Stremio CTA into watch options', () => {
    // Add IMDb link
    const imdbLink = global.document.createElement('a');
    imdbLink.href = 'https://www.imdb.com/title/tt0816692/';
    global.document.body.appendChild(imdbLink);

    // Add movie watch options container
    const watchOption = global.document.createElement('div');
    watchOption.setAttribute('data-attrid', 'kc:/film/film:media_actions_wholepage');
    const level1 = global.document.createElement('div');
    const level2 = global.document.createElement('div');
    const existingProvider = global.document.createElement('div');
    existingProvider.textContent = 'Netflix';

    level2.appendChild(existingProvider);
    level1.appendChild(level2);
    watchOption.appendChild(level1);
    global.document.body.appendChild(watchOption);

    scriptModule.addStremioButtonToGoogle();

    const cta = watchOption.querySelector('.stremio-cta__href');
    assert.ok(cta, 'Stremio CTA should be added');
    assert.equal(cta.href, 'stremio:///detail/movie/tt0816692');
    assert.equal(level2.children.length, 2, 'Should have both Stremio and Netflix');
    assert.equal(level2.children[1].textContent, 'Netflix', 'Netflix should remain untouched');

    // Repeated call should not duplicate
    scriptModule.addStremioButtonToGoogle();
    const ctas = watchOption.querySelectorAll('.stremio-cta__href');
    assert.equal(ctas.length, 1);
  });

  test('addStremioButtonToGoogle falls back to FAB when no watch options row exists', () => {
    const imdbLink = global.document.createElement('a');
    imdbLink.href = 'https://www.imdb.com/title/tt0903747/';
    global.document.body.appendChild(imdbLink);

    scriptModule.addStremioButtonToGoogle();

    const fab = global.document.getElementById('floating-btn');
    assert.ok(fab, 'Should fall back to floating button');
    assert.equal(fab.href, 'stremio:///detail/movie/tt0903747');
  });

  test('addStremioButtonToDuckDuckGo injects Stremio into quick links', () => {
    const titleSection = global.document.createElement('div');
    titleSection.setAttribute('data-react-module-id', 'titles');

    const titleText = global.document.createElement('div');
    titleText.textContent = 'Breaking Bad (TV Series 2008-2013)';
    titleSection.appendChild(titleText);

    const imdbLink = global.document.createElement('a');
    imdbLink.href = 'https://www.imdb.com/title/tt0903747/';
    titleSection.appendChild(imdbLink);

    const quickLinksWrapper = global.document.createElement('div');
    const quickLinksHeader = global.document.createElement('div');
    const quickLinksSpan = global.document.createElement('span');
    quickLinksSpan.textContent = 'Quick links';
    quickLinksHeader.appendChild(quickLinksSpan);

    const quickLinksDiv = global.document.createElement('div');
    quickLinksDiv.textContent = 'IMDb Wikipedia';
    const firstChild = global.document.createElement('a');
    const img = global.document.createElement('img');
    const span = global.document.createElement('span');
    span.textContent = 'IMDb';
    firstChild.appendChild(img);
    firstChild.appendChild(span);
    quickLinksDiv.appendChild(firstChild);

    quickLinksWrapper.appendChild(quickLinksHeader);
    quickLinksWrapper.appendChild(quickLinksDiv);
    titleSection.appendChild(quickLinksWrapper);
    global.document.body.appendChild(titleSection);

    scriptModule.addStremioButtonToDuckDuckGo();

    const stremioLink = quickLinksDiv.querySelector("a[href^='stremio:///detail/series/tt0903747']");
    assert.ok(stremioLink, 'Stremio link should be inserted into quick links');
    assert.equal(stremioLink.querySelector('span').textContent, 'Stremio');
  });
});

describe('Extensions Zip Archives Structure', () => {
  const { execSync } = require('child_process');
  const extensionsDir = path.join(__dirname, '../extensions');

  const checkArchive = (zipName, expectedFolder) => {
    const zipPath = path.join(extensionsDir, zipName);
    assert.ok(fs.existsSync(zipPath), `${zipName} must exist in extensions/`);

    const output = execSync(`tar -tf "${zipPath}"`).toString();
    const files = output.split(/\r?\n/).map(f => f.trim()).filter(Boolean);

    // Root folder must be expectedFolder/
    assert.ok(files.some(f => f === `${expectedFolder}/`), `Missing root folder ${expectedFolder}/ in ${zipName}`);
    assert.ok(files.some(f => f === `${expectedFolder}/manifest.json`), `Missing ${expectedFolder}/manifest.json in ${zipName}`);
    assert.ok(files.some(f => f === `${expectedFolder}/scripts/script.js`), `Missing script.js in ${zipName}`);
    assert.ok(files.some(f => f === `${expectedFolder}/styles/styles.css`), `Missing styles.css in ${zipName}`);
  };

  test('extensions folder contains only the 2 variation release zips', () => {
    const zips = fs.readdirSync(extensionsDir).filter(f => f.endsWith('.zip'));
    assert.deepEqual(zips.sort(), [
      'stremio-google-search-chrome-v2.0.0.zip',
      'stremio-google-search-firefox-v2.0.0.zip',
    ].sort());
  });

  test('stremio-google-search-chrome-v2.0.0.zip contains matching root folder', () => {
    checkArchive('stremio-google-search-chrome-v2.0.0.zip', 'stremio-google-search-chrome-v2.0.0');
  });

  test('stremio-google-search-firefox-v2.0.0.zip contains matching root folder', () => {
    checkArchive('stremio-google-search-firefox-v2.0.0.zip', 'stremio-google-search-firefox-v2.0.0');
  });
});

