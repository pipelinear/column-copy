# Column Copy

Select two horizontal boundaries and copy the text between them, from the top to the bottom of the page. No build, account, or server required.

## Install in Chrome or Edge

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose the unzipped `column-copy` folder (or the source folder if you downloaded the repository).
4. Pin **Column Copy** using the browser's Extensions menu.

## Use

1. Open a webpage and click **Column Copy**, or press **Alt+Shift+C** (Option+Shift+C on Mac).
2. Drag horizontally from one edge of the text you want to the other. Either direction works; the vertical position of your drag doesn't matter.
3. Adjust either edge, or enter exact X coordinates in pixels.
4. Leave **Entire page** checked to scan from top to bottom, or uncheck it to copy only the current visible area.
5. Click **Read page**, press **Enter** while the picker is open, or use **Alt+Shift+R** (**Option+Shift+R** on Mac).
6. Review the output, make any edits, then click **Copy output** and paste anywhere. Reading never changes your clipboard; copying never re-reads the page.

The Read and Copy buttons stay side by side at the same size, including when the result is partial. The larger panel uses stronger type and 52px-high main buttons. The settings cog beside the title opens **Skip navigation and buttons** and **Fix common typos**; both are enabled by default. Full-page mode stays directly accessible.

If the reading shortcut is unavailable, assign it under `chrome://extensions/shortcuts`. When no column is selected yet, the shortcut opens the picker and asks you to select one. Enter inside the editable output inserts a new line.

Full-page mode scrolls the document and accessible reader panes, including same-origin embedded frames, to trigger lazy loading. It collects text as it goes and restores the original scroll positions afterward. Keep the page open during the scan. **Escape** cancels and restores your position and the panel. Outside a scan, Escape dismisses open settings first, then closes the picker. Endless pages are limited to 300 scan steps or two minutes and produce an explicit partial-result warning.

While reading, the main panel disappears so you can watch the page. A blue laser line sweeps down the selected column before each text snapshot. This is visual feedback for text extraction, not OCR. A compact progress/cancel control sits outside the column when there is space; otherwise all controls remain hidden and Escape cancels. The panel returns after completion, cancellation, or an error. With reduced-motion preferences enabled, the moving sweep is replaced by a static line.

**Skip navigation and buttons** in settings also excludes sidebars. Uncheck it to include that text. **Full width** selects the entire page width, and **Redraw** starts again.

Output appears automatically after reading. If a reader cannot be accessed or the scan cannot finish, a warning stays above the output. The same **Copy output** button copies the available result, with a partial-result label in the status.

**Fix common typos** applies a small local list of common misspellings (for example, “teh” → “the” and “recieved” → “received”) and removes soft hyphens and normalizes common ligatures. Corrections are listed beneath the output. Uncheck it to return to the original reading before making manual edits. If you have already edited the output, changing this setting preserves those edits and applies the new setting on your next read. Unknown words such as “wadxawdwkai” are left intact rather than guessed. The editable output enables the browser's spelling suggestions for manual review. Code blocks are left unchanged.

## What gets copied

- Rendered page text inside the horizontal range, in document reading order. Whole words are selected by their centers, so selection edges no longer produce chopped word fragments. Place the boundaries outside the article's text to include complete sentences.
- Paragraphs, headings, lists, emphasis, and explicit line breaks. Source-code wrapping is collapsed into normal paragraphs. The clipboard includes HTML for apps such as Google Docs and plain text for other apps. Use ordinary Paste to retain formatting.
- Text throughout the scanned document, including content below the screen, same-origin embedded readers, and accessible open shadow roots.
- Hidden elements, scripts, form values, and the extension's own controls are excluded.

The scanner waits for the bottom to stop growing, but cannot guarantee content that appears only after a button click, a chapter change, or a long network delay. It does not click Next Chapter. Virtualized readers that remove and recreate the same paragraphs may duplicate text. Overlapping elements and unusual CSS layouts may differ from document reading order.

Cross-origin embedded readers are reported as inaccessible. Open the embedded reader in its own tab and run Column Copy there. Images, canvas text, browser PDF viewers, closed shadow roots, and CSS-generated text are not extracted. **OCR is not included**; canvas content produces a warning. Direct text extraction preserves exact words and formatting when the reader exposes its text.

Chrome blocks extensions on internal browser pages and the Chrome Web Store. A **!** on the extension icon indicates that the page is inaccessible; hover over it for guidance. To use local HTML files, enable **Allow access to file URLs** in the extension's details.

## Privacy and permissions

Everything runs locally. The extension sends no page content anywhere and does not read your clipboard. Scrolling may cause the website itself to load more content. The extension uses `activeTab` and `scripting` to run only when invoked, and `clipboardWrite` to copy your selection. See Chrome's [activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and [permission reference](https://developer.chrome.com/docs/extensions/reference/permissions-list).

## Development

The extension itself has no dependencies. After edits, click **Reload** on its card in `chrome://extensions`, then refresh the webpage.

Run `npm run check` for JavaScript syntax checks and `npm run test:unit` for extraction, formatting, cleanup, keyboard-command routing, iframe-coordinate, merge, and cancellation tests (no dependencies needed). For browser integration tests: `npm install`, `npx playwright install chromium`, then `npm test`.

The [frontend-design skill](../skills/frontend-design/SKILL.md) is included locally with its license and source information. `AGENTS.md` makes it available for UI work in this project on subsequent turns. It comes from [Anthropic's skills repository](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
