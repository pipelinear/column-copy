async function activate(tab, read = false) {
  if (!tab?.id) return;
  try {
    if (read) {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const controller = globalThis.__columnCopyController;
          if (!controller?.readPage) return false;
          void controller.readPage();
          return true;
        },
      });
      if (result?.result) return;
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extract.js', 'scan.js', 'cleanup.js', 'content.js'],
    });
    if (read) await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { void globalThis.__columnCopyController?.readPage(); },
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Column Copy — select a column' });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#555555' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: 'Column Copy cannot access this page. Open a regular webpage. For local files, enable Allow access to file URLs in extension settings.',
    });
  }
}
chrome.action.onClicked.addListener(tab => activate(tab));
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'read-page') return;
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await activate(tab, true);
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'column-copy-shortcuts') return;
  chrome.commands.getAll().then(commands => {
    respond({ read: commands.find(command => command.name === 'read-page')?.shortcut || '' });
  }).catch(() => respond({ read: '' }));
  return true;
});
