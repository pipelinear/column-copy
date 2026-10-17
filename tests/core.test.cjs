const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

// Deterministic geometry for the extraction rules. Browser integration tests
// separately cover real layout, dragging, ClipboardItem, lazy loading, and scroll.
function environment() {
  const defaults = { display: 'block', visibility: 'visible', opacity: '1', overflowX: 'visible', overflowY: 'visible', contentVisibility: 'visible' };
  const context = { Intl, console, DOMException, scrollX: 0, scrollY: 0, innerHeight: 600, Date,
    setTimeout: fn => { fn(); return 0; } };
  context.window = context;
  context.getComputedStyle = node => ({ ...defaults, ...node.style });
  const rect = (left = 0, top = 0, width = 800, height = 30) => ({ left, top, width, height, right: left + width, bottom: top + height });
  function makeDocument() {
    const doc = { defaultView: context };
    doc.createRange = () => {
      let node, start = 0, end = 0;
      return {
        selectNodeContents(n) { node = n; start = 0; end = n.data.length; },
        setStart(n, at) { node = n; start = at; },
        setEnd(n, at) { node = n; end = at; },
        getClientRects() { return [rect(node.x + start * 10, node.y, (end - start) * 10, 20)]; },
      };
    };
    doc.createElement = tag => element(tag, [], {}, doc);
    doc.documentElement = element('HTML', [], {}, doc);
    doc.body = element('BODY', [], {}, doc);
    doc.scrollingElement = Object.assign(doc.documentElement, { scrollTop: 0, scrollLeft: 0, clientHeight: 600, scrollHeight: 600 });
    return doc;
  }
  function element(tag, children = [], style = {}, doc, geometry = rect()) {
    const node = { nodeType: 1, tagName: tag, style, childNodes: children, children: children.filter(n => n.nodeType === 1), ownerDocument: doc,
      getAttribute() { return null; }, closest() { return null; },
      getBoundingClientRect() { return geometry; },
      clientLeft: 0, clientTop: 0, clientWidth: geometry.width, clientHeight: geometry.height,
      offsetWidth: geometry.width, offsetHeight: geometry.height, scrollHeight: geometry.height, scrollTop: 0, scrollLeft: 0,
      append(child) { this.childNodes.push(child); this.children.push(child); child.parentElement = this; },
      remove() { if (this.parentElement) this.parentElement.childNodes = this.parentElement.childNodes.filter(n => n !== this); },
    };
    for (const child of children) { child.parentElement = node; child.ownerDocument = doc; }
    return node;
  }
  const doc = makeDocument();
  const text = (data, x = 100, y = 20, ownerDocument = doc) => ({ nodeType: 3, data, x, y, ownerDocument });
  const el = (tag, children, style, geometry, owner = doc) => element(tag, children, style, owner, geometry);
  context.document = doc;
  vm.createContext(context);
  vm.runInContext(source('extract.js'), context);
  vm.runInContext(source('scan.js'), context);
  return { context, doc, text, el, rect, makeDocument };
}

test('paragraphs collapse source wrapping and preserve headings and emphasis as safe HTML', () => {
  const { context: c, doc, text, el } = environment();
  doc.body.append(el('H2', [text('A heading')]));
  doc.body.append(el('P', [text('A sentence\n   with '), el('STRONG', [text('bold')], { display: 'inline' }), text(' and <literal> markup.')]));
  const result = c.columnCopy.format(c.columnCopy.collect(0, 800).blocks);
  assert.equal(result.text, 'A heading\n\nA sentence with bold and <literal> markup.');
  assert.match(result.html, /<h2>A heading<\/h2>/);
  assert.match(result.html, /<strong>bold<\/strong>/);
  assert.match(result.html, /&lt;literal&gt;/);
});

test('boundary selection keeps complete words instead of character fragments', () => {
  const { context: c, doc, text, el } = environment();
  doc.body.append(el('P', [text('alpha bravo charlie', 0)]));
  assert.equal(c.columnCopy.format(c.columnCopy.collect(70, 100).blocks).text, 'bravo');
});

test('full-page includes below-screen text; visible-only and clean settings are respected', () => {
  const { context: c, doc, text, el } = environment();
  doc.body.append(el('P', [text('Visible paragraph')]));
  doc.body.append(el('P', [text('Bottom paragraph', 100, 2000)]));
  doc.body.append(el('NAV', [text('Navigation')]));
  doc.body.append(el('P', [text('Hidden')], { display: 'none' }));
  const read = options => c.columnCopy.format(c.columnCopy.collect(0, 800, options).blocks).text;
  assert.equal(read({}), 'Visible paragraph\n\nBottom paragraph');
  assert.equal(read({ fullPage: false }), 'Visible paragraph');
  assert.match(read({ clean: false }), /Navigation/);
});

test('iframe coordinate translation includes deep text and reports inaccessible frames', () => {
  const { context: c, doc, text, el, rect, makeDocument } = environment();
  const childDoc = makeDocument();
  childDoc.body.append(el('P', [text('Embedded bottom', 10, 2200, childDoc)], {}, undefined, childDoc));
  const frame = el('IFRAME', [], {}, rect(200, 100, 400, 200));
  frame.contentDocument = childDoc;
  doc.body.append(frame);
  const result = c.columnCopy.collect(200, 600);
  assert.equal(result.blocks[0].text, 'Embedded bottom');
  assert.equal(result.warnings.length, 0);
  frame.contentDocument = null;
  assert.match(c.columnCopy.collect(200, 600).warnings[0], /embedded reader/);
});

test('snapshot merging preserves repeats at different positions and inserts lazy blocks in order', () => {
  const { context: c } = environment();
  const a = { key: 1, text: 'same' }, b = { key: 2, text: 'same' }, late = { key: 3, text: 'late' };
  const merged = c.columnCopyMerge([a, b], [a, late, b]);
  assert.equal(merged.length, 3);
  assert.equal(merged.map(x => x.key).join(','), '1,3,2');
  assert.equal(c.columnCopyMerge(merged, [a, late, b]).length, 3);
});

test('scan restores scroll position, reports completion, and abort restores state', async () => {
  const { context: c, doc, text, el } = environment();
  doc.body.append(el('P', [text('Complete text')]));
  doc.scrollingElement.scrollTop = 47;
  const result = await c.columnCopyScan(0, 800);
  assert.equal(result.blocks[0].text, 'Complete text');
  assert.equal(result.warnings.length, 0);
  assert.equal(doc.scrollingElement.scrollTop, 47);
  const signal = { aborted: true };
  await assert.rejects(c.columnCopyScan(0, 800, { signal }), { name: 'AbortError' });
  assert.equal(doc.scrollingElement.scrollTop, 47);
});

test('scan awaits a sweep before extraction and checks cancellation after it', async () => {
  const { context: c, doc, text, el } = environment();
  doc.body.append(el('P', [text('Before sweep')]));
  let sweeps = 0;
  const result = await c.columnCopyScan(0, 800, { fullPage: false, onSweep: async () => {
    await Promise.resolve();
    sweeps++;
    doc.body.childNodes[0].childNodes[0].data = 'After sweep';
  } });
  assert.equal(sweeps, 1);
  assert.equal(result.blocks[0].text, 'After sweep');
  const signal = { aborted: false };
  await assert.rejects(c.columnCopyScan(0, 800, {
    signal, onSweep: async () => { signal.aborted = true; },
  }), { name: 'AbortError' });
  assert.equal(doc.scrollingElement.scrollTop, 0);
});
