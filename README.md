# LeetCode Input Copy

This is a LeetCode-only browser extension for Brave or Chrome-compatible browsers.

## What it does

When you open a LeetCode problem page, the extension adds a `Copy IO` button near the existing IDE buttons. Clicking that button:

- reads every `pre` tag inside `.elfjs`
- extracts each `Input:` and `Output:` pair
- reads the text from the single `span.mtk11` element
- copies this generated code to the clipboard:

```js
const a = [`input1`, `input2`];
const b = [`output1`, `output2`];
const help = require("./concept/helper");
help.singleValue(variableFromMtk11, a, b);
```

The button is inserted to the right of the debugger controls and uses LeetCode's existing utility classes for styling.

## Load in Brave

1. Open `brave://extensions/`
2. Enable Developer mode
3. Click Load unpacked
4. Select this folder

## Notes

- The extension only runs on `leetcode.com` and `leetcode.cn`
- The copied code uses the `.mtk11` text as a raw variable name
- If copy or extraction fails, the page shows an alert with the error message
- The extension no longer depends on clicking the extension icon