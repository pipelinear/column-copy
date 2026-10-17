const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'cleanup.js'), 'utf8'), context);
const cleanup = context.columnCopyCleanup;
const block = (text, html = text, tag = 'p') => ({ key: 1, text, html, tag });

test('fixes common typos, retains capitalization and rich text, and records changes', () => {
  const result = cleanup([block('Teh goverment recieved teh letter.', 'Teh <strong>goverment</strong> recieved teh letter.')]);
  assert.equal(result.blocks[0].text, 'The government received the letter.');
  assert.equal(result.blocks[0].html, 'The <strong>government</strong> received the letter.');
  assert.equal(result.changes.reduce((sum, change) => sum + change.count, 0), 4);
  assert.equal(cleanup([block('TEH')]).blocks[0].text, 'THE');
});

test('does not invent replacements for gibberish, names, numbers, or identifiers', () => {
  const text = 'wadxawdwkai Jefferson Pinckney 1796 tEh form from constructor';
  assert.equal(cleanup([block(text)]).blocks[0].text, text);
  assert.equal(cleanup([block(text)]).changes.length, 0);
});

test('normalizes extraction artifacts without breaking emoji or changing code', () => {
  assert.equal(cleanup([block('ofﬁce co\u00adoperation a\u200bb 👩🏽‍💻')]).blocks[0].text, 'office cooperation ab 👩🏽‍💻');
  assert.equal(cleanup([block('teh', '<code>teh</code>')]).blocks[0].text, 'teh');
  assert.equal(cleanup([block('teh', 'teh', 'pre')]).blocks[0].text, 'teh');
});

test('original blocks remain unchanged so corrections can be undone', () => {
  const original = block('teh');
  const result = cleanup([original]);
  assert.equal(original.text, 'teh');
  assert.equal(original.html, 'teh');
  assert.equal(result.blocks[0].text, 'the');
});
