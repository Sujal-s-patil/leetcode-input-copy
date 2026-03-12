# Project Context

## Goal

Build a Brave-compatible browser extension that works only on LeetCode pages. It injects a `Copy IO` button into the page toolbar, extracts problem example data from the current page, and copies a generated JavaScript snippet to the clipboard when that button is clicked.

## User Requirements

- No popup UI
- Only active on LeetCode
- Read data from the current page
- Find the `.elfjs` container
- Read all `pre` tags inside `.elfjs`
- Extract `Input:` and `Output:` from each `pre`
- Ignore `Explanation:` and other sections
- Read text from the single `span.mtk11` element
- Treat the `mtk11` text as a raw variable name
- Build arrays from all extracted inputs and outputs
- Add a page button near the LeetCode debugger button
- On page button click, copy the generated code to the clipboard

## Expected Clipboard Output

```js
const a = [`${input}`];
const b = [`${output}`];
const help = require("./concept/helper");
help.singleValue(mtk11, a, b);
```

Actual implementation supports multiple values, so `a` and `b` can contain more than one entry.

## Current Files

- `manifest.json`: Manifest V3 definition and content script registration
- `content.js`: Toolbar button injection, page extraction logic, and clipboard copy
- `README.md`: Load instructions and behavior summary
- `CONTEXT.md`: This reference document

## Current Implementation Notes

- Uses Manifest V3
- Uses a content script on:
  - `https://leetcode.com/*`
  - `https://leetcode.cn/*`
- Injects a `Copy IO` button into `#ide-top-btns`
- Inserts the button before the secondary button cluster so it appears to the right of the debugger controls
- Uses LeetCode button utility classes for styling
- Shows button-state text such as `Copying...`, `Copied`, or `Error`
- Displays an alert if extraction or copy fails

## Extraction Logic

The extension currently does the following:

1. Waits for the LeetCode toolbar to appear
2. Injects a `Copy IO` button into the IDE action row
3. Searches for `.elfjs`
4. Searches all `pre` tags inside that container
5. Falls back to broader example block detection when `.elfjs` is absent
6. Searches for `span.mtk11`
7. Parses every example block for `Input:` and `Output:`
8. Copies code in this form:

```js
const a = [`input1`, `input2`];
const b = [`output1`, `output2`];
const help = require("./concept/helper");
help.singleValue(variableFromMtk11, a, b);
```

## Important Debugging Context

There were two main issues with the earlier extension-icon approach:

- DOM lookup mismatches because LeetCode renders parts of the UI dynamically
- clipboard failures because Brave rejected background and offscreen clipboard writes when the document was not focused

To address that, the extension now:

- injects a real page button that the user clicks directly
- runs extraction in the page context through the content script
- search through open shadow roots
- wait briefly for LeetCode content to render
- use direct page-triggered clipboard copy with a textarea fallback
- targets `.elfjS` (capital S) and `[data-track-load="description_content"]` as primary description selectors

## Known Risks

- LeetCode DOM can change at any time
- `.elfjs` and `.mtk11` may not be stable selectors across all pages or future UI versions
- Some pages may render content late or in a different subtree
- Clipboard access can still fail if the page is not focused or the browser blocks copy commands
- Closed shadow roots cannot be traversed by this implementation

## How To Debug

1. Open `brave://extensions/`
2. Enable Developer mode
3. Open DevTools on the LeetCode page
4. Click the `Copy IO` button on the page
5. Check console errors from `content.js`

Common failure messages:

- `Missing span.mtk11 element`
- `No example blocks found on this LeetCode page.`
- `No Input/Output pairs found in ... blocks.`
- `Copy failed. Click inside the page and try again.`

## Next Good Improvements

- Add more robust selector fallbacks if LeetCode changes its DOM
- Add a test page or mock HTML sample for parser verification
- Add optional debug mode logging