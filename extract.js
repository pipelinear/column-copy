(() => {
  const ids = new WeakMap();
  let nextId = 0;
  const idFor = node => {
    if (!ids.has(node)) ids.set(node, ++nextId);
    return ids.get(node);
  };
  const escape = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ignored = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT', 'SELECT']);
  const uiRoles = new Set(['navigation', 'toolbar', 'menubar', 'menu', 'tablist', 'progressbar', 'button', 'complementary']);
  const words = new Intl.Segmenter(undefined, { granularity: 'word' });

  function collect(left, right, { host, fullPage = true, clean = true } = {}) {
    const blocks = [];
    const warnings = new Set();
    let buffer = null;
    function flush() {
      if (!buffer) return;
      buffer.text = buffer.text.replace(/ *\n */g, '\n').trim();
      if (buffer.text) blocks.push(buffer);
      buffer = null;
    }
    function append(text, node, formatting, owner, tag) {
      if (!text) return;
      if (!buffer || buffer.owner !== owner) {
        flush();
        buffer = { key: idFor(node), owner, tag, text: '', html: '' };
      }
      buffer.text += text;
      let html = escape(text).replace(/\n/g, '<br>');
      for (const mark of formatting) html = `<${mark}>${html}</${mark}>`;
      buffer.html += html;
    }

    function readText(node, context, formatting, owner, tag) {
      const parent = node.parentElement || node.getRootNode().host;
      if (!parent || context.win.getComputedStyle(parent).visibility !== 'visible') return;
      const range = node.ownerDocument.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
      const horizontal = r => r.right * context.sx + context.x >= context.left && r.left * context.sx + context.x <= context.right;
      const vertical = r => fullPage || (r.bottom * context.sy + context.y > context.top && r.top * context.sy + context.y < context.bottom);
      if (!rects.some(r => horizontal(r) && vertical(r))) return;
      // Collapse source-code wrapping, not paragraph boundaries. Never cut words.
      const normalize = text => tag === 'pre' ? text : text.replace(/\s+/g, ' ');
      const contained = r => r.left * context.sx + context.x >= context.left && r.right * context.sx + context.x <= context.right && vertical(r);
      if (rects.every(contained)) {
        append(normalize(node.data), node, formatting, owner, tag);
        return;
      }
      let result = '';
      let skipped = false;
      for (const { segment, index } of words.segment(node.data)) {
        range.setStart(node, index);
        range.setEnd(node, index + segment.length);
        const selected = [...range.getClientRects()].some(r => {
          const middle = (r.left + r.width / 2) * context.sx + context.x;
          return r.width > 0 && r.height > 0 && middle >= context.left && middle <= context.right && vertical(r);
        });
        if (selected) {
          if (skipped && result && !/\s$/.test(result) && !/^\s/.test(segment)) result += ' ';
          result += segment;
          skipped = false;
        } else skipped = true;
      }
      append(normalize(result), node, formatting, owner, tag);
    }

    function visit(node, context, formatting = [], owner = null, tag = 'p') {
      if (node === host) return;
      if (node.nodeType === 3) { readText(node, context, formatting, owner, tag); return; }
      if (node.nodeType !== 1 && node.nodeType !== 11) return;
      let block = false;
      if (node.nodeType === 1) {
        if (ignored.has(node.tagName)) return;
        const style = context.win.getComputedStyle(node);
        if (style.display === 'none' || style.contentVisibility === 'hidden' || Number(style.opacity) === 0 || node.getAttribute('aria-hidden') === 'true') return;
        if (clean && (uiRoles.has(node.getAttribute('role')) || ['NAV', 'BUTTON', 'ASIDE'].includes(node.tagName) ||
          (['HEADER', 'FOOTER'].includes(node.tagName) && !node.closest('article, main')))) return;
        const rect = node.getBoundingClientRect();
        if (['IFRAME', 'FRAME'].includes(node.tagName)) {
          flush();
          const sx = rect.width / (node.offsetWidth || rect.width || 1);
          const sy = rect.height / (node.offsetHeight || rect.height || 1);
          const x = context.x + (rect.left + node.clientLeft * sx) * context.sx;
          const y = context.y + (rect.top + node.clientTop * sy) * context.sy;
          const frameContext = { win: null, x, y, sx: context.sx * sx, sy: context.sy * sy,
            left: Math.max(context.left, x), right: Math.min(context.right, x + node.clientWidth * sx * context.sx),
            top: Math.max(context.top, y), bottom: Math.min(context.bottom, y + node.clientHeight * sy * context.sy) };
          if (frameContext.right <= frameContext.left || (!fullPage && frameContext.bottom <= frameContext.top)) return;
          try {
            const doc = node.contentDocument;
            if (!doc?.body) throw new Error('inaccessible');
            frameContext.win = doc.defaultView;
            visit(doc.body, frameContext);
          } catch {
            warnings.add('An embedded reader could not be read. Open that reader in its own tab and run Column Copy there.');
          }
          flush();
          return;
        }
        if (node.tagName === 'CANVAS') {
          if (rect.width > 100 && rect.height > 50 && rect.right * context.sx + context.x > context.left && rect.left * context.sx + context.x < context.right) {
            warnings.add('This range contains a canvas. Text drawn as pixels needs OCR and is not included.');
          }
          return;
        }
        if (node.tagName === 'BR') { append('\n', node, formatting, owner, tag); return; }
        block = !['inline', 'contents', 'inline-block', 'inline-flex', 'inline-grid'].includes(style.display);
        if (block) {
          flush(); owner = node;
          tag = /^H[1-6]$/.test(node.tagName) ? node.tagName.toLowerCase() :
            ({ LI: 'li', PRE: 'pre', BLOCKQUOTE: 'blockquote' }[node.tagName] || 'p');
        }
        const mark = ({ B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', CODE: 'code', SUP: 'sup', SUB: 'sub' })[node.tagName];
        if (mark) formatting = [...formatting, mark];
        if (rect.width && ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
          context = { ...context, left: Math.max(context.left, rect.left * context.sx + context.x), right: Math.min(context.right, rect.right * context.sx + context.x) };
        }
        if (!fullPage && ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
          context = { ...context, top: Math.max(context.top, rect.top * context.sy + context.y), bottom: Math.min(context.bottom, rect.bottom * context.sy + context.y) };
        }
      }
      const children = node.shadowRoot ? node.shadowRoot.childNodes :
        (node.tagName === 'SLOT' && node.assignedNodes().length ? node.assignedNodes() : node.childNodes);
      for (const child of children) visit(child, context, formatting, owner, tag);
      if (block) flush();
    }
    visit(document.body, { win: window, x: scrollX, y: scrollY, sx: 1, sy: 1, left, right, top: scrollY, bottom: scrollY + innerHeight });
    flush();
    return { blocks: blocks.map(({ owner, ...block }) => block), warnings: [...warnings] };
  }

  function format(blocks) {
    const text = blocks.map(b => (b.tag === 'li' ? '• ' : '') + b.text).join('\n\n');
    const html = blocks.map(b => b.tag === 'li' ? `<ul><li>${b.html.trim()}</li></ul>` : `<${b.tag}>${b.html.trim()}</${b.tag}>`).join('');
    return { text, html: `<html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>` };
  }
  globalThis.columnCopy = { collect, format };
  globalThis.columnCopyExtract = (left, right, host) => format(collect(left, right, { host }).blocks).text;
})();
