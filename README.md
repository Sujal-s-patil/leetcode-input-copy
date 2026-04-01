# LeetCode Input Copy

This is a LeetCode-only browser extension for Brave or Chrome-compatible browsers.

## What it does

When you open a LeetCode problem page, the extension adds a `Copy IO` button near the existing IDE buttons. Clicking that button:

- reads example `Input:` and `Output:` blocks from the description
- reads the function name from `span.mtk11`
- reads starter code from the Monaco editor
- copies this generated code to the clipboard:

```js
/**
 * starter code from current editor
 */

const a = [[...],[...]];
const b = [[...],[...]];

const help = require("./concept/helper");
help.singleValue(variableFromMtk11, a, b);
```

For examples that use exactly two named inputs (for example `Input: num1 = "2", num2 = "3"`), the extension now generates:

```js
const a = ["2", "123"];
const b = ["3", "456"];
const c = ["6", "56088"];

const help = require("./concept/helper");
help.twoValue(variableFromMtk11, a, b,c);
```

The button is inserted to the right of the debugger controls and uses LeetCode's existing utility classes for styling.

For binary tree problems whose starter code includes TreeNode parameters, the extension converts example array inputs into built tree instances before putting them into the helper input array. For example:

```js
const { buildBinaryTree } = require("./concept/atol");
const b1 = buildBinaryTree([2, 1, 3]);
const b2 = buildBinaryTree([5, 1, 4, null, null, 3, 6]);

const a = [b1, b2];
const b = [true, false];

const help = require("./concept/helper");
help.singleValue(variableFromMtk11, a, b);
```

## Load in Brave

1. Open `brave://extensions/`
2. Enable Developer mode
3. Click Load unpacked
4. Select this folder

## Notes

- The extension only runs on `leetcode.com` and `leetcode.cn`
- The copied code uses the `.mtk11` text as a raw variable name
- Arrays and numbers are copied as real JS values, not strings
- If copy or extraction fails, the page shows an alert with the error message
- The extension no longer depends on clicking the extension icon