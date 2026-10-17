const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(exists = false) {
  const handlers = {}, calls = [];
  const chrome = {
    action: { onClicked: { addListener: fn => handlers.action = fn },
      setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    commands: { onCommand: { addListener: fn => handlers.command = fn }, getAll: async () => [{ name: 'read-page', shortcut: 'Alt+Shift+R' }] },
    runtime: { onMessage: { addListener: fn => handlers.message = fn } },
    tabs: { query: async () => [{ id: 42 }] },
    scripting: { executeScript: async args => { calls.push(args); return [{ result: exists }]; } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), { chrome });
  return { calls, handlers };
}
test('read shortcut invokes existing picker without reinjecting or closing it', async () => {
  const { calls, handlers } = setup(true);
  await handlers.command('read-page', { id: 12 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target.tabId, 12);
  assert.equal(calls[0].files, undefined);
  assert.match(calls[0].func.toString(), /controller.readPage/);
});
test('read shortcut opens missing picker, loads cleanup, and requests reading', async () => {
  const { calls, handlers } = setup();
  await handlers.command('read-page');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].target.tabId, 42);
  assert.ok(calls[1].files.includes('cleanup.js'));
  assert.match(calls[2].func.toString(), /readPage/);
});
test('toolbar activation still loads the picker without reading or copying', async () => {
  const { calls, handlers } = setup();
  await handlers.action({ id: 15 });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].files.includes('content.js'));
});
test('registered shortcut is returned for the interface hint', async () => {
  const { handlers } = setup();
  const result = await new Promise(resolve => handlers.message({ type: 'column-copy-shortcuts' }, {}, resolve));
  assert.equal(result.read, 'Alt+Shift+R');
});
