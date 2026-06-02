# LeetCode Input Copy Extension

This is a browser extension for Chrome, Brave, and other Chromium-based browsers designed to streamline your local development workflow for LeetCode problems.

## Overview

The extension adds a **Copy IO** button to LeetCode problem pages. When clicked, it intelligently extracts the problem's example inputs, outputs, and the starter code. It then generates a complete JavaScript snippet and copies it to your clipboard.

This allows you to quickly paste the code into a local file, run it with Node.js, and start debugging with your own test cases almost instantly.

## Features

-   **One-Click Test Case Generation**: Automatically creates a runnable script with all example cases.
-   **Handles Multiple Inputs**: Correctly parses problems with single, multiple, named, or unnamed inputs.
-   **Data Structure Support**: Automatically generates builder function calls for `TreeNode` (Binary Trees) and `ListNode` (Linked Lists).
-   **Local Testing Ready**: The generated code is designed to work with the included `helper.js` file for easy test execution and validation.

## How It Works

When you click the **Copy IO** button, the extension performs the following actions:

1.  **Extracts Examples**: It scans the problem description for all `Input:` and `Output:` blocks.
2.  **Finds Function Name**: It identifies the name of the function you need to implement (e.g., `twoSum`).
3.  **Reads Starter Code**: It pulls the boilerplate code directly from the LeetCode editor.
4.  **Generates Script**: It assembles the extracted information into a JavaScript file. This script includes:
    - The starter code.
    - Arrays for each input parameter, populated with the example values.
    - An array for the expected outputs.
    - A call to the `multiValue` function from `helper.js` to run the tests.
5.  **Copies to Clipboard**: The final script is copied to your clipboard, ready to be pasted into a local file.

### Generated Code Example

For a problem with two inputs (`nums` and `target`) and one output, the copied code will look like this:

```javascript
// Starter code from the LeetCode editor appears here
var twoSum = function(nums, target) {
    // ...
};

// Helper functions for creating data structures (if needed)
// const { buildBinaryTree } = require("./concept/atol");

// Input and output arrays are created from the examples
const a = [[2,7,11,15], [3,2,4], [3,3]];
const b = [9, 6, 6];
const c = [[0,1], [1,2], [0,1]];

// The helper file is required
const help = require("./helper");

// The multiValue function runs your code against the test cases
help.multiValue(twoSum, [a, b], c);
```

## The `helper.js` Utility

The `helper.js` file is a crucial part of this extension's workflow. It is a simple Node.js module designed to run the test cases and provide clear, color-coded feedback in your terminal.

**Location:** Make sure `helper.js` is in the same directory as the file where you paste the copied code, or adjust the `require` path accordingly.

### `multiValue(func, inputSeries, expected)`

This is the primary function you will interact with.

-   `func`: The function to be tested (e.g., `twoSum`).
-   `inputSeries`: An array of arrays, where each inner array represents a series of inputs for one parameter. For example, `[[input1_case1, input1_case2], [input2_case1, input2_case2]]`.
-   `expected`: An array of the expected outputs for each test case.

When you run the script, `multiValue` iterates through the test cases, calls your function with the appropriate inputs, and compares the result to the expected output.

-   **Green (`<-->`)**: Indicates the actual output matches the expected output.
-   **Red (`<-->`)**: Indicates a mismatch.

## Installation

1.  Open your browser's extensions page (`chrome://extensions` or `brave://extensions`).
2.  Enable **Developer mode**.
3.  Click **Load unpacked**.
4.  Select the folder containing this extension's files (`manifest.json`, etc.).

The extension is now active and will add the **Copy IO** button on LeetCode problem pages.
