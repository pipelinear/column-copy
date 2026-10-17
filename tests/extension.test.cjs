const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const path = require('node:path');
let browser, page;
const root = path.join(__dirname, '..');

before(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
});
after(async () => { await browser?.close(); });

async function fixture() {
  await page.setContent(readFileSync(path.join(__dirname, 'fixture.html'), 'utf8'));
  await page.evaluate(() => {
    window.copiedText = undefined;
    window.richText = undefined;
    document.querySelector('#shadow-host').attachShadow({ mode: 'open' }).innerHTML = 'Direct shadow text.<p>Shadow text included.</p>';
  });
  await page.addScriptTag({ path: path.join(root, 'extract.js') });
  await page.addScriptTag({ path: path.join(root, 'scan.js') });
  await page.addScriptTag({ path: path.join(root, 'cleanup.js') });
}

async function readOutput(overlay) {
  await overlay.locator('.read').click();
  await page.waitForFunction(() => {
    const button = document.querySelector('column-copy-overlay').shadowRoot.querySelector('.read');
    return !button.disabled && button.textContent === 'Read page';
  });
}

test('extracts the entire column, excludes sidebars and hidden text, preserves inline spacing', async () => {
  await fixture();
  const text = await page.evaluate(() => columnCopyExtract(230, 700));
  assert.match(text, /The selected article/);
  assert.match(text, /First paragraph with bold text and a link\./);
  assert.match(text, /Second paragraph\.\nExplicit new line\./);
  assert.match(text, /BOTTOM TEXT INCLUDED/);
  assert.match(text, /Shadow text included/);
  assert.match(text, /Direct shadow text/);
  assert.match(text, /café 👩🏽‍💻 日本語/);
  assert.doesNotMatch(text, /EXCLUDED/);
});

test('keeps whole words at boundaries and remains correct after vertical scrolling', async () => {
  await fixture();
  const band = await page.evaluate(() => {
    const node = document.querySelector('#clipped').firstChild;
    const range = document.createRange();
    range.setStart(node, 2); range.setEnd(node, 6);
    const rect = range.getBoundingClientRect();
    return { left: rect.left + scrollX, right: rect.right + scrollX };
  });
  const before = await page.evaluate(b => columnCopyExtract(b.left, b.right), band);
  assert.match(before, /ABCDEFGHIJ/);
  await page.evaluate(() => scrollTo(0, 1500));
  const after = await page.evaluate(b => columnCopyExtract(b.left, b.right), band);
  assert.equal(after, before);
});

test('drag, edge adjustment, clipboard payload, empty range, Escape, and reinvocation', async () => {
  await fixture();
  await page.evaluate(() => {
    scrollTo(0, 0);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.copiedText = text; }
    }});
  });
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  await page.mouse.move(700, 200);
  await page.mouse.down();
  await page.mouse.move(230, 210, { steps: 8 });
  await page.mouse.up();
  assert.equal(await overlay.locator('.from').inputValue(), '230');
  assert.equal(await overlay.locator('.to').inputValue(), '700');
  assert.equal(await overlay.locator('.copy').isDisabled(), true);
  await readOutput(overlay);
  assert.equal(await page.evaluate(() => window.copiedText), undefined);
  await overlay.locator('.copy').click();
  await page.waitForFunction(() => window.copiedText);
  const copied = await page.evaluate(() => window.copiedText);
  assert.match(copied, /BOTTOM TEXT INCLUDED/);
  assert.doesNotMatch(copied, /Column Copy|EXCLUDED/);
  await page.mouse.move(230, 350);
  await page.mouse.down();
  await page.mouse.move(200, 350);
  await page.mouse.up();
  assert.equal(await overlay.locator('.from').inputValue(), '200');
  await overlay.locator('.to').fill('1050');
  await overlay.locator('.to').press('Tab');
  await overlay.locator('.from').fill('1000');
  await overlay.locator('.from').press('Tab');
  await readOutput(overlay);
  await page.waitForFunction(() => document.querySelector('column-copy-overlay').shadowRoot.querySelector('.status').textContent.includes('No text'));
  assert.match(await overlay.locator('.status').innerText(), /No text/);
  assert.equal(await page.evaluate(() => window.copiedText), copied);
  await page.keyboard.press('Escape');
  assert.equal(await overlay.count(), 0);
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  assert.equal(await overlay.count(), 1);
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  assert.equal(await overlay.count(), 0);
});

test('clipboard denial exposes a manual copy fallback', async () => {
  await fixture();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new Error('Denied'); }
    }});
    document.execCommand = () => false;
  });
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  await overlay.locator('.all').click();
  await readOutput(overlay);
  await overlay.locator('.copy').click();
  await overlay.locator('.fallback').waitFor({ state: 'visible' });
  assert.equal(await overlay.locator('.fallback').isVisible(), true);
  assert.match(await overlay.locator('.fallback').inputValue(), /BOTTOM TEXT INCLUDED/);
  await page.keyboard.press('Escape');
});

test('preserves rich paragraphs and reads a scaled iframe below the screen', async () => {
  await fixture();
  await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'display:block;margin-left:240px;width:440px;height:300px;border:0;transform:scale(.8);transform-origin:top left';
    frame.srcdoc = '<body style="margin:0"><h2>Embedded heading</h2><p>Embedded <em>emphasis</em> stays together.</p><p style="margin-top:1900px">FRAME BOTTOM TEXT</p></body>';
    document.body.append(frame);
    await new Promise(resolve => frame.onload = resolve);
  });
  const result = await page.evaluate(() => columnCopy.format(columnCopy.collect(230, 700).blocks));
  assert.match(result.text, /FRAME BOTTOM TEXT/);
  assert.match(result.html, /<h2>Embedded heading<\/h2>/);
  assert.match(result.html, /<em>emphasis<\/em>/);
  const visible = await page.evaluate(() => columnCopy.format(columnCopy.collect(230, 700, { fullPage: false }).blocks).text);
  assert.doesNotMatch(visible, /BOTTOM TEXT|Embedded heading/);
});

test('full-page scan loads lazy text in nested panes and restores scroll position', async () => {
  await fixture();
  await page.evaluate(() => {
    const pane = document.createElement('div');
    pane.id = 'reader-pane';
    pane.style.cssText = 'margin-left:240px;width:440px;height:200px;overflow:auto';
    pane.innerHTML = '<p>Pane beginning.</p><p style="margin-top:800px">Pane original end.</p>';
    pane.addEventListener('scroll', () => {
      if (!pane.dataset.loaded && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 5) {
        pane.dataset.loaded = 'true';
        const p = document.createElement('p');
        p.textContent = 'LAZY FINAL PARAGRAPH';
        p.style.marginTop = '800px';
        pane.append(p);
      }
    });
    document.body.append(pane);
    scrollTo(0, 350);
    pane.scrollTop = 40;
  });
  const result = await page.evaluate(async () => {
    const collected = await columnCopyScan(230, 700);
    return { text: columnCopy.format(collected.blocks).text, warnings: collected.warnings,
      top: scrollY, paneTop: document.querySelector('#reader-pane').scrollTop };
  });
  assert.match(result.text, /LAZY FINAL PARAGRAPH/);
  assert.equal(result.text.match(/Pane beginning/g).length, 1);
  assert.equal(result.top, 350);
  assert.equal(result.paneTop, 40);
  assert.deepEqual(result.warnings, []);
});

test('rich clipboard contains HTML and cancelling a scan restores scrolling', async () => {
  await fixture();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async items => { window.richText = await (await items[0].getType('text/html')).text(); }
    }});
    if (typeof ClipboardItem === 'undefined') window.ClipboardItem = class {
      constructor(data) { this.data = data; }
      getType(type) { return this.data[type]; }
    };
    scrollTo(0, 100);
  });
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  await overlay.locator('.all').click();
  await overlay.locator('.full-page').uncheck();
  await readOutput(overlay);
  await overlay.locator('.copy').click();
  await page.waitForFunction(() => window.richText);
  assert.match(await page.evaluate(() => window.richText), /<p>/);
  await overlay.locator('.full-page').check();
  await overlay.locator('.read').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => scrollY === 100);
  await overlay.locator('.panel').waitFor({ state: 'visible' });
  assert.match(await overlay.locator('.status').innerText(), /cancelled/);
  await page.keyboard.press('Escape');
  assert.equal(await overlay.count(), 0);
});

test('read and copy are equal sized, partial output is editable, and Enter reads without copying', async () => {
  await fixture();
  await page.evaluate(() => {
    scrollTo(0, 0);
    window.readCount = 0;
    window.columnCopyScan = async () => {
      window.readCount++;
      return { blocks: [{ key: 1, tag: 'p', text: 'Teh goverment.', html: 'Teh <strong>goverment</strong>.' }], warnings: ['An embedded reader could not be read.'] };
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.copiedText = text; }
    }});
  });
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  await overlay.locator('.all').click();
  await overlay.locator('.all').evaluate(node => node.blur());
  await page.keyboard.press('Enter');
  await overlay.locator('.preview').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.copiedText), undefined);
  assert.equal(await overlay.locator('.preview').innerText(), 'The government.');
  const readBox = await overlay.locator('.read').boundingBox();
  const copyBox = await overlay.locator('.copy').boundingBox();
  assert.equal(readBox.width, copyBox.width);
  assert.equal(readBox.height, copyBox.height);
  assert.ok(readBox.height >= 44);
  assert.equal(await overlay.locator('.copy').isEnabled(), true);
  await overlay.locator('.settings-toggle').click();
  await overlay.locator('.autocorrect').uncheck();
  assert.equal(await overlay.locator('.preview').innerText(), 'Teh goverment.');
  await overlay.locator('.autocorrect').check();
  await overlay.locator('.preview').fill('My revised output.');
  await overlay.locator('.preview').press('Enter');
  assert.equal(await page.evaluate(() => window.readCount), 1);
  await overlay.locator('.copy').click();
  await page.waitForFunction(() => window.copiedText);
  assert.equal((await page.evaluate(() => window.copiedText)).trim(), 'My revised output.');
  assert.equal(await page.evaluate(() => window.readCount), 1);
  await overlay.locator('.close').click();
});

test('settings are tucked away and scanning hides the panel with a cancellable laser', async () => {
  await fixture();
  await page.evaluate(() => scrollTo(0, 100));
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  assert.equal(await overlay.locator('.settings').isVisible(), false);
  await overlay.locator('.settings-toggle').click();
  assert.equal(await overlay.locator('.clean').isVisible(), true);
  assert.equal(await overlay.locator('.settings-toggle').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await overlay.locator('.settings').isVisible(), false);
  assert.equal(await overlay.count(), 1);
  await page.mouse.move(240, 180);
  await page.mouse.down();
  await page.mouse.move(700, 180);
  await page.mouse.up();
  await overlay.locator('.read').click();
  assert.equal(await overlay.locator('.panel').isVisible(), false);
  await overlay.locator('.laser').waitFor({ state: 'visible' });
  const dock = await overlay.locator('.scan-dock').boundingBox();
  assert.ok(dock.x + dock.width < 240);
  await overlay.locator('.cancel-scan').click();
  await overlay.locator('.panel').waitFor({ state: 'visible' });
  assert.equal(await overlay.locator('.laser').isVisible(), false);
  assert.equal(await overlay.locator('.scan-dock').isVisible(), false);
  assert.equal(await page.evaluate(() => scrollY), 100);
  assert.match(await overlay.locator('.status').innerText(), /cancelled/);
  await overlay.locator('.all').click();
  await overlay.locator('.read').click();
  assert.equal(await overlay.locator('.scan-dock').isVisible(), false);
  await page.keyboard.press('Escape');
  await overlay.locator('.panel').waitFor({ state: 'visible' });
  await overlay.locator('.close').click();
});

test('reduced motion skips the moving sweep and restores panel after a failed read', async () => {
  await fixture();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    window.beamAnimations = 0;
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.classList.contains('laser')) window.beamAnimations++;
      return originalAnimate.apply(this, args);
    };
    window.columnCopyScan = async (left, right, options) => {
      await options.onSweep();
      throw new Error('Test read error');
    };
  });
  await page.addScriptTag({ path: path.join(root, 'content.js') });
  const overlay = page.locator('column-copy-overlay');
  await overlay.locator('.all').click();
  await readOutput(overlay);
  assert.equal(await page.evaluate(() => window.beamAnimations), 0);
  assert.equal(await overlay.locator('.panel').isVisible(), true);
  assert.equal(await overlay.locator('.laser').isVisible(), false);
  assert.match(await overlay.locator('.status').innerText(), /Test read error/);
  await overlay.locator('.close').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});
