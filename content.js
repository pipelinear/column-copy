(() => {
  const key = '__columnCopyController';
  if (globalThis[key]) { globalThis[key].close(); return; }
  const host = document.createElement('column-copy-overlay');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { color-scheme:light; --paper:#fafaf9; --ink:#252525; --muted:#646464; --line:#d7d7d4; --wash:#efefec; --radius:7px; font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      * { box-sizing:border-box; }
      [hidden] { display:none!important; }
      .surface { position:fixed; inset:0; cursor:crosshair; pointer-events:auto; touch-action:none; user-select:none; }
      .shade { position:absolute; top:0; bottom:0; background:#0005; pointer-events:none; }
      .left { left:0; } .right { right:0; }
      .band { position:absolute; top:0; bottom:0; border-inline:1px solid #fff; box-shadow:inset 1px 0 #262626,inset -1px 0 #262626; pointer-events:none; overflow:hidden; }
      .laser { position:absolute; top:0; left:0; right:0; height:2px; background:#4263eb; box-shadow:0 0 7px #4263eb99; pointer-events:none; }
      .laser::before { content:''; position:absolute; bottom:2px; left:0; right:0; height:42px; background:linear-gradient(transparent,#4263eb16); }
      .edge { position:absolute; top:0; bottom:0; width:18px; margin-left:-9px; cursor:ew-resize; pointer-events:auto; }
      .edge::after { content:''; position:absolute; top:45%; left:4px; width:10px; height:38px; background:var(--paper); border:1px solid #555; border-radius:5px; box-shadow:0 1px 4px #0003; }
      .panel { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); width:min(510px,calc(100vw - 24px)); max-height:calc(100vh - 24px); overflow:auto; border:1px solid #c7c7c3; border-radius:12px; background:var(--paper); color:var(--ink); box-shadow:0 8px 28px #0003; pointer-events:auto; font:500 15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      .heading { display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:1px solid var(--line); }
      .heading strong { font-size:20px; font-weight:750; letter-spacing:-.4px; }
      .header-actions { display:flex; align-items:center; gap:6px; }
      .settings-toggle { width:36px; height:36px; padding:8px; border-color:transparent; background:transparent; }
      .settings-toggle[aria-expanded="true"] { background:var(--wash); border-color:var(--line); }
      .settings-toggle svg { display:block; width:20px; height:20px; }
      .body { padding:22px; }
      p { margin:0; }
      .instruction { margin-bottom:18px; color:var(--ink); font-weight:550; }
      button { font:500 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:var(--ink); background:var(--paper); border:1px solid var(--line); border-radius:var(--radius); padding:7px 10px; cursor:pointer; }
      button:hover:not(:disabled) { background:var(--wash); border-color:#a5a5a1; }
      button:active:not(:disabled) { transform:translateY(1px); }
      button:focus-visible,input:focus-visible,summary:focus-visible,.preview:focus-visible { outline:2px solid var(--ink); outline-offset:3px; }
      button:disabled { color:#858580; background:#e9e9e6; border-color:#dededb; cursor:default; }
      .close { border:0; background:transparent; font-size:25px; width:36px; height:36px; padding:0; line-height:1; }
      .selection { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
      .range { display:flex; align-items:center; gap:8px; }
      .range label { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--muted); }
      .range input { width:70px; padding:8px; border:1px solid var(--line); border-radius:6px; background:white; color:var(--ink); font:600 14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      .selection-actions { display:flex; gap:4px; }
      .selection-actions button { font-size:13px; font-weight:600; padding:8px 10px; }
      .options { display:grid; gap:12px; padding-bottom:20px; }
      .settings { margin-bottom:18px; padding:16px; border:1px solid var(--line); border-radius:8px; background:var(--wash); }
      .settings p { font-size:12px; color:var(--muted); font-weight:400; }
      .options label { display:flex; align-items:center; gap:8px; cursor:pointer; }
      .options input { width:17px; height:17px; margin:0; accent-color:#303030; }
      .actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; }
      .actions button { min-height:52px; font-size:16px; font-weight:700; }
      .actions .read { background:var(--ink); color:#fff; border-color:var(--ink); }
      .actions .read:hover:not(:disabled) { background:#414141; }
      .actions .read:disabled { background:#686866; border-color:#686866; color:#eee; }
      .shortcuts { text-align:center; color:var(--muted); font-size:12px; margin-top:12px; font-weight:400; }
      .status { color:var(--muted); font-size:13px; margin-top:16px; font-weight:400; }
      .scan-dock { position:fixed; top:16px; padding:12px; width:174px; border:1px solid var(--line); border-radius:9px; background:var(--paper); color:var(--ink); box-shadow:0 3px 14px #0002; pointer-events:auto; font:600 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      .scan-dock p { margin-bottom:8px; }
      .scan-dock button { width:100%; }
      .surface.scanning { cursor:progress; }
      .surface.scanning .shade { background:#0002; }
      .surface.scanning .edge { display:none; }
      @media (prefers-reduced-motion:reduce) { .laser::before { display:none; } }
      .warning { margin-top:12px; padding:10px 12px; border-left:2px solid #8b7250; background:#f0ece5; color:#554936; font-size:12px; white-space:pre-line; }
      .results { margin-top:16px; border-top:1px solid var(--line); padding-top:12px; }
      .output-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px; }
      .output-heading strong { font-size:12px; font-weight:600; }
      .output-heading span { font-size:11px; color:var(--muted); }
      .preview { max-height:230px; min-height:100px; overflow:auto; padding:14px; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:var(--radius); font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; user-select:text; overflow-wrap:anywhere; }
      .preview p { margin:0 0 12px; }
      .preview p:last-child { margin-bottom:0; }
      .preview h1,.preview h2,.preview h3 { margin:0 0 12px; line-height:1.3; }
      .edits { margin-top:8px; font-size:11px; color:var(--muted); }
      .edits summary { cursor:pointer; }
      .changes { margin:8px 0 0; padding-left:18px; }
      .fallback { width:100%; height:120px; margin-top:12px; padding:8px; color:var(--ink); background:white; border:1px solid var(--line); }
    </style>
    <div class="surface" aria-label="Drag horizontally to select a column">
      <div class="shade left"></div><div class="shade right"></div><div class="band" hidden><div class="laser" hidden aria-hidden="true"></div></div>
      <div class="edge start" data-edge="left" hidden></div><div class="edge end" data-edge="right" hidden></div>
    </div>
    <section class="panel" role="dialog" aria-label="Column Copy">
      <div class="heading"><strong>Column Copy</strong><div class="header-actions"><button class="settings-toggle" aria-label="Reading settings" aria-expanded="false" aria-controls="reading-settings" title="Reading settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.6 2.1-1.8 1L5 5.6 2.5 9.9 4 11.5v2L2.5 15 5 19.3l2.1-.5 1.8 1 .6 2.2h5l.6-2.2 1.8-1 2.1.5 2.5-4.3-1.5-1.5v-2l1.5-1.6L19 5.6l-2.1.5-1.8-1-.6-2.1z"/><circle cx="12" cy="12.5" r="3"/></svg></button><button class="close" aria-label="Close (Escape)">×</button></div></div>
      <div class="body">
        <p class="instruction">Drag across the text you want to read.</p>
        <div class="selection">
          <div class="range" hidden><label>From <input class="from" type="number" min="0" aria-label="Left boundary in pixels"></label><label>to <input class="to" type="number" min="0" aria-label="Right boundary in pixels"></label></div>
          <div class="selection-actions"><button class="reset">Redraw</button><button class="all">Full width</button></div>
        </div>
        <div class="options">
          <label><input class="full-page" type="checkbox" checked>Entire page, including text below the screen</label>
        </div>
        <div class="options settings" id="reading-settings" hidden>
          <label><input class="clean" type="checkbox" checked>Skip navigation and buttons</label>
          <label><input class="autocorrect" type="checkbox" checked>Fix common typos</label>
          <p>Changes apply to the next read. Common typo fixes can also be undone before editing the output.</p>
        </div>
        <div class="actions"><button class="read" disabled>Read page</button><button class="copy" disabled>Copy output</button></div>
        <div class="shortcuts">Enter to read · Esc to close</div>
        <div class="status" role="status" aria-live="polite">Choose a column, then read the page.</div>
        <div class="warning" role="alert" hidden></div>
        <section class="results" hidden aria-label="Read output">
          <div class="output-heading"><strong>Output</strong><span>Edit text before copying</span></div>
          <div class="preview" contenteditable="true" spellcheck="true" lang="en" role="textbox" aria-label="Output text" aria-multiline="true"></div>
          <details class="edits" hidden><summary></summary><ul class="changes"></ul></details>
        </section>
        <textarea class="fallback" aria-label="Selected text — copy manually" hidden readonly></textarea>
      </div>
    </section>
    <aside class="scan-dock" aria-label="Page scanning" hidden>
      <p class="scan-status" role="status" aria-live="polite">Reading…</p>
      <button class="cancel-scan">Cancel reading</button>
    </aside>`;
  document.documentElement.append(host);
  const $ = selector => shadow.querySelector(selector);
  const abort = new AbortController();
  const listen = (node, event, handler, options = {}) => node.addEventListener(event, handler, { ...options, signal: abort.signal });
  let bounds = null;
  let drag = null;
  let busy = false;
  let isReading = false;
  let scanAbort = null;
  let beamAnimation = null;
  let closed = false;
  let rawBlocks = null;
  let output = null;
  let outputEdited = false;
  let hasWarnings = false;
  const previousFocus = document.activeElement;
  const maxX = () => Math.max(document.documentElement.scrollWidth, innerWidth);
  const point = event => Math.max(0, Math.min(maxX(), event.clientX + scrollX));

  function placeScanDock() {
    const leftSpace = Math.max(0, Math.min(innerWidth, (bounds?.left || 0) - scrollX));
    const rightSpace = Math.max(0, innerWidth - Math.max(0, (bounds?.right || innerWidth) - scrollX));
    const fitsLeft = leftSpace >= 198;
    const fitsRight = rightSpace >= 198;
    $('.scan-dock').hidden = !isReading || (!fitsLeft && !fitsRight);
    $('.scan-dock').style.left = fitsLeft ? '12px' : 'auto';
    $('.scan-dock').style.right = fitsLeft ? 'auto' : '12px';
  }

  function stopBeam() {
    beamAnimation?.cancel();
    beamAnimation = null;
    $('.laser').hidden = true;
  }

  async function sweep() {
    if (scanAbort?.signal.aborted || closed) return;
    const line = $('.laser');
    line.hidden = false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      line.style.transform = 'translateY(0)';
      // Give the unobstructed page a paint opportunity without a moving beam.
      await new Promise(resolve => setTimeout(resolve, 16));
      return;
    }
    beamAnimation = line.animate([
      { transform: 'translateY(0)' },
      { transform: `translateY(${Math.max(0, innerHeight - 2)}px)` },
    ], { duration: 460, easing: 'linear' });
    try { await beamAnimation.finished; }
    catch { /* Cancellation releases the pending scan immediately. */ }
    finally { stopBeam(); }
  }

  function render() {
    const selected = bounds && bounds.right - bounds.left >= 2;
    $('.band').hidden = $('.start').hidden = $('.end').hidden = !selected;
    $('.range').hidden = !selected;
    $('.read').disabled = !selected || busy;
    $('.copy').disabled = !output?.text || busy;
    for (const control of shadow.querySelectorAll('.options input, .range input, .reset, .all')) control.disabled = busy;
    $('.preview').contentEditable = busy ? 'false' : 'true';
    $('.panel').setAttribute('aria-busy', String(busy));
    $('.panel').hidden = isReading;
    $('.surface').classList.toggle('scanning', isReading);
    $('.settings-toggle').disabled = busy;
    placeScanDock();
    $('.left').style.width = bounds ? `${Math.max(0, bounds.left - scrollX)}px` : '100%';
    $('.right').style.width = bounds ? `${Math.max(0, innerWidth - bounds.right + scrollX)}px` : '0';
    if (bounds) {
      $('.band').style.left = `${bounds.left - scrollX}px`;
      $('.band').style.width = `${bounds.right - bounds.left}px`;
      $('.start').style.left = `${bounds.left - scrollX}px`;
      $('.end').style.left = `${bounds.right - scrollX}px`;
      $('.from').value = Math.round(bounds.left);
      $('.to').value = Math.round(bounds.right);
    }
    $('.instruction').textContent = selected ? 'Adjust the edges, then read the page.' : 'Drag across the text you want to read.';
  }
  function close() {
    closed = true;
    scanAbort?.abort();
    stopBeam();
    abort.abort();
    host.remove();
    delete globalThis[key];
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function invalidate() {
    rawBlocks = output = null;
    outputEdited = hasWarnings = false;
    $('.warning').hidden = $('.results').hidden = $('.fallback').hidden = true;
    $('.status').textContent = $('.full-page').checked ? 'Reading scrolls to the bottom, then returns you here.' : 'Reading includes only the current visible area.';
  }
  function updateOutput() {
    if (!rawBlocks) return;
    const cleaned = $('.autocorrect').checked ? globalThis.columnCopyCleanup(rawBlocks) : { blocks: rawBlocks, changes: [] };
    output = globalThis.columnCopy.format(cleaned.blocks);
    outputEdited = false;
    $('.preview').innerHTML = output.html.split('<!--StartFragment-->')[1].split('<!--EndFragment-->')[0];
    $('.results').hidden = !output.text;
    $('.changes').replaceChildren();
    for (const change of cleaned.changes) {
      const item = document.createElement('li');
      item.textContent = `${change.from} → ${change.to}${change.count > 1 ? ` (${change.count})` : ''}`;
      $('.changes').append(item);
    }
    const count = cleaned.changes.reduce((sum, change) => sum + change.count, 0);
    $('.edits').hidden = !count;
    $('.edits summary').textContent = `${count} spelling ${count === 1 ? 'correction' : 'corrections'} · uncheck “Fix common typos” to undo`;
    $('.status').textContent = output.text ? `${output.text.length.toLocaleString()} characters ready${hasWarnings ? ' (partial result)' : ''}. Review or edit, then copy.` : 'No text in this range. Try wider edges.';
    render();
  }

  listen($('.surface'), 'pointerdown', event => {
    if (event.button !== 0 || busy) return;
    event.preventDefault(); invalidate();
    const edge = event.target.dataset.edge;
    drag = { anchor: edge === 'left' ? bounds.right : edge === 'right' ? bounds.left : point(event) };
    $('.surface').setPointerCapture(event.pointerId);
    if (!edge) bounds = { left: drag.anchor, right: drag.anchor };
    render();
  });
  listen($('.surface'), 'pointermove', event => {
    if (!drag) return;
    bounds = { left: Math.min(drag.anchor, point(event)), right: Math.max(drag.anchor, point(event)) };
    render();
  });
  const endDrag = () => { drag = null; render(); };
  listen($('.surface'), 'pointerup', endDrag);
  listen($('.surface'), 'pointercancel', endDrag);
  listen(window, 'scroll', render, { passive: true });
  listen(window, 'resize', render);
  listen($('.close'), 'click', close);
  listen($('.settings-toggle'), 'click', () => {
    const open = $('.settings').hidden;
    $('.settings').hidden = !open;
    $('.settings-toggle').setAttribute('aria-expanded', String(open));
  });
  listen($('.cancel-scan'), 'click', () => scanAbort?.abort());
  listen($('.reset'), 'click', () => { bounds = null; invalidate(); render(); });
  listen($('.all'), 'click', () => { bounds = { left: 0, right: maxX() }; invalidate(); render(); });
  for (const field of ['.full-page', '.clean']) listen($(field), 'change', () => { invalidate(); render(); });
  listen($('.autocorrect'), 'change', () => {
    if (outputEdited) {
      $('.status').textContent = 'Your edits are kept. The cleanup setting will apply next time you read.';
      render();
    } else updateOutput();
  });
  for (const field of ['.from', '.to']) listen($(field), 'change', () => {
    invalidate();
    const a = Number($('.from').value), b = Number($('.to').value);
    bounds = { left: Math.max(0, Math.min(a, b)), right: Math.min(maxX(), Math.max(a, b)) };
    render();
  });
  // Pasted edits stay plain text. Clipboard HTML is rebuilt from a small tag
  // allowlist so pasted page markup cannot introduce active content or styles.
  function editedOutput() {
    const allowed = new Set(['P','DIV','BR','H1','H2','H3','H4','H5','H6','STRONG','B','EM','I','UL','OL','LI','PRE','CODE','BLOCKQUOTE','SUP','SUB']);
    const box = document.createElement('div');
    function walk(source, target) {
      for (const node of source.childNodes) {
        if (node.nodeType === 3) target.append(document.createTextNode(node.data));
        else if (node.nodeType === 1 && !['SCRIPT','STYLE','IFRAME','OBJECT'].includes(node.tagName)) {
          if (allowed.has(node.tagName)) {
            const child = document.createElement(node.tagName.toLowerCase());
            walk(node, child); target.append(child);
          } else walk(node, target);
        }
      }
    }
    walk($('.preview'), box);
    return { text: $('.preview').innerText.trim(), html: box.innerHTML };
  }
  listen($('.preview'), 'input', () => {
    outputEdited = true;
    output = editedOutput();
    $('.edits').hidden = true;
    $('.status').textContent = `${output.text.length.toLocaleString()} characters${hasWarnings ? ' (partial result)' : ''}. Your edits will be copied.`;
    render();
  });
  listen($('.preview'), 'paste', event => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
  });

  async function copyOutput() {
    if (!output?.text || busy) return;
    const { text, html } = outputEdited ? editedOutput() : output;
    busy = true; render();
    let copied = false;
    try {
      try {
        if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          })]);
        } else await navigator.clipboard.writeText(text);
        copied = true;
      } catch { /* Use a copy event on HTTP pages or when rich clipboard is unavailable. */ }
      if (closed) return;
      if (!copied) {
        const textarea = $('.fallback');
        textarea.hidden = false; textarea.value = text;
        textarea.focus({ preventScroll: true }); textarea.select();
        const handleCopy = event => {
          if (!event.clipboardData) return;
          event.clipboardData.setData('text/plain', text);
          event.clipboardData.setData('text/html', html);
          event.preventDefault();
        };
        document.addEventListener('copy', handleCopy, true);
        try { copied = document.execCommand('copy'); }
        finally { document.removeEventListener('copy', handleCopy, true); }
        if (copied) textarea.hidden = true;
      }
      $('.status').textContent = copied ? `Copied ${text.length.toLocaleString()} characters${hasWarnings ? ' (partial result)' : ''}. Paste with ${/Mac/.test(navigator.platform) ? '⌘V' : 'Ctrl+V'}.` : 'Press ⌘C / Ctrl+C to copy the selected text below.';
    } catch (error) { $('.status').textContent = `Could not copy: ${error.message}`; }
    finally { busy = false; render(); }
  }
  async function readPage() {
    if (busy) return;
    if (!bounds || bounds.right - bounds.left < 2) {
      $('.status').textContent = 'Drag to choose a column, or select Full width, then read again.';
      return;
    }
    invalidate(); busy = true; isReading = true;
    scanAbort = new AbortController();
    scanAbort.signal.addEventListener('abort', stopBeam, { once: true });
    $('.scan-status').textContent = 'Reading…';
    $('.read').textContent = 'Reading…';
    $('.status').textContent = 'Reading the page…';
    render();
    if (!$('.scan-dock').hidden) $('.cancel-scan').focus({ preventScroll: true });
    else shadow.activeElement?.blur();
    try {
      const collected = await globalThis.columnCopyScan(bounds.left, bounds.right, {
        host, fullPage: $('.full-page').checked, clean: $('.clean').checked,
        signal: scanAbort.signal,
        onSweep: sweep,
        onProgress: message => {
          $('.status').textContent = message;
          $('.scan-status').textContent = message.match(/\d+%/) ? `Reading ${message.match(/\d+%/)[0]}` : 'Reading…';
        },
      });
      if (closed) return;
      rawBlocks = collected.blocks;
      hasWarnings = collected.warnings.length > 0;
      $('.warning').textContent = collected.warnings.join('\n');
      $('.warning').hidden = !hasWarnings;
      updateOutput();
    } catch (error) {
      if (!closed) $('.status').textContent = error.name === 'AbortError' ? 'Reading cancelled. Your position has been restored.' : `Could not read: ${error.message}`;
    } finally {
      stopBeam();
      scanAbort = null;
      busy = false; isReading = false;
      $('.read').textContent = 'Read page';
      render();
      if (!closed) $('.read').focus({ preventScroll: true });
    }
  }
  globalThis[key] = { close, readPage };
  listen($('.read'), 'click', readPage);
  listen($('.copy'), 'click', copyOutput);
  listen(window, 'keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (isReading) scanAbort?.abort();
      else if (!$('.settings').hidden) {
        $('.settings').hidden = true;
        $('.settings-toggle').setAttribute('aria-expanded', 'false');
        $('.settings-toggle').focus({ preventScroll: true });
      } else close();
      return;
    }
    const active = shadow.activeElement || document.activeElement;
    const editing = active?.isContentEditable || ['INPUT', 'TEXTAREA', 'BUTTON'].includes(active?.tagName);
    if (event.key === 'Enter' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !editing) {
      event.preventDefault(); event.stopImmediatePropagation(); readPage();
    }
  }, { capture: true });
  if (globalThis.chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'column-copy-shortcuts' }).then(response => {
      if (response?.read) $('.shortcuts').textContent = `${response.read} or Enter to read · Esc to close`;
    }).catch(() => {});
  }
  render();
})();
