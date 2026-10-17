(() => {
  // Keep repeated paragraphs at distinct DOM locations. Only deduplicate the
  // same block seen again in overlapping scroll snapshots.
  function mergeSnapshots(previous, incoming) {
    const token = block => `${block.key}\0${block.text}`;
    const known = new Map(previous.map(block => [token(block), block]));
    const result = [...previous];
    let pending = [];
    for (const block of incoming) {
      const existing = known.get(token(block));
      if (existing) {
        if (pending.length) result.splice(result.indexOf(existing), 0, ...pending);
        pending = [];
      } else {
        pending.push(block);
        known.set(token(block), block);
      }
    }
    return result.concat(pending);
  }

  async function scan(left, right, options = {}) {
    const { host, signal, onProgress = () => {}, onSweep = async () => {}, fullPage = true } = options;
    const check = () => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
    if (!fullPage) {
      check();
      await onSweep();
      check();
      return globalThis.columnCopy.collect(left, right, options);
    }
    const targets = [];
    const seen = new Set();
    const styles = [];
    const styledDocs = new Set();
    let blocks = [];
    const warnings = new Set();
    const start = Date.now();
    const pause = async ms => { await new Promise(resolve => setTimeout(resolve, ms)); check(); };
    function discover(doc = document, offset = scrollX, scale = 1) {
      if (!doc.body) return;
      if (!styledDocs.has(doc)) {
        const style = doc.createElement('style');
        style.textContent = '* { scroll-behavior: auto !important; scroll-snap-type: none !important; overflow-anchor: none !important; }';
        doc.documentElement.append(style);
        styles.push(style); styledDocs.add(doc);
      }
      const add = node => {
        if (!node || seen.has(node)) return;
        seen.add(node);
        targets.push({ node, top: node.scrollTop, left: node.scrollLeft });
      };
      add(doc.scrollingElement);
      function walk(node) {
        if (node === host || node.nodeType !== 1) return;
        const style = doc.defaultView.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || node.getAttribute('aria-hidden') === 'true') return;
        const rect = node.getBoundingClientRect();
        const intersects = rect.right * scale + offset > left && rect.left * scale + offset < right;
        if (intersects && node.clientHeight > 40 && node.scrollHeight > node.clientHeight + 2 && ['auto', 'scroll'].includes(style.overflowY)) add(node);
        if (node.tagName === 'IFRAME' && intersects) {
          try {
            if (node.contentDocument?.body) {
              const factor = rect.width / (node.offsetWidth || rect.width || 1);
              discover(node.contentDocument, offset + (rect.left + node.clientLeft * factor) * scale, scale * factor);
            }
          } catch { /* collect() reports inaccessible frames. */ }
        }
        for (const child of node.shadowRoot?.children || node.children) walk(child);
      }
      walk(doc.body);
    }
    async function snapshot() {
      await onSweep();
      check();
      const result = globalThis.columnCopy.collect(left, right, options);
      blocks = mergeSnapshots(blocks, result.blocks);
      result.warnings.forEach(warning => warnings.add(warning));
    }
    let steps = 0;
    let partial = false;
    try {
      discover();
      for (const { node } of targets) node.scrollTop = 0;
      await pause(350);
      await snapshot();
      for (let index = 0; index < targets.length; index++) {
        const { node } = targets[index];
        node.scrollTop = 0;
        let stableBottom = 0;
        while (stableBottom < 3) {
          check();
          if (++steps > 300 || Date.now() - start > 120000) { partial = true; break; }
          const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
          const top = node.scrollTop;
          onProgress(`Reading to the bottom… ${Math.round(Math.min(1, (top + node.clientHeight) / Math.max(1, node.scrollHeight)) * 100)}% of scroll area ${index + 1}. Esc cancels.`);
          node.scrollTop = Math.min(maximum, top + Math.max(100, node.clientHeight * 0.8));
          await pause(top >= maximum - 2 ? 700 : 250);
          discover();
          await snapshot();
          const newMaximum = Math.max(0, node.scrollHeight - node.clientHeight);
          if (node.scrollTop >= newMaximum - 2 && newMaximum === maximum) stableBottom++;
          else stableBottom = 0;
          // A site may prevent scrolling; don't loop indefinitely or claim completion.
          if (node.scrollTop === top && top < newMaximum - 2) { partial = true; break; }
        }
        if (partial) break;
      }
      if (partial) warnings.add('Partial result: the page kept growing or prevented scrolling. Load the remaining text and try again.');
      return { blocks, warnings: [...warnings] };
    } finally {
      for (const { node, top, left: x } of targets) {
        node.scrollLeft = x; node.scrollTop = top;
      }
      styles.forEach(style => style.remove());
    }
  }
  globalThis.columnCopyScan = scan;
  globalThis.columnCopyMerge = mergeSnapshots;
})();
