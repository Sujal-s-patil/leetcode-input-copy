const BUTTON_ROOT_ID = "leetcode-input-copy-root";
const BUTTON_ID = "leetcode-input-copy-button";
const TOOLBAR_SELECTOR = "#ide-top-btns";
const VARIABLE_SELECTOR = "span.mtk11";
const DESCRIPTION_SELECTOR = ".elfjS, .elfjs, [data-track-load='description_content']";
let mountScheduled = false;

init();

function init() {
  mountButton();

  const observer = new MutationObserver(() => {
    scheduleMount();
  });

  const observerTarget = document.body || document.documentElement;
  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
  });
}

function scheduleMount() {
  if (mountScheduled) {
    return;
  }

  mountScheduled = true;
  requestAnimationFrame(() => {
    mountScheduled = false;
    mountButton();
  });
}

function mountButton() {
  const toolbar = document.querySelector(TOOLBAR_SELECTOR);
  if (!toolbar) {
    return;
  }

  const existingRoot = document.getElementById(BUTTON_ROOT_ID);
  if (existingRoot) {
    if (existingRoot.parentElement !== toolbar) {
      existingRoot.remove();
    } else {
      return;
    }
  }

  const root = document.createElement("div");
  root.id = BUTTON_ROOT_ID;
  root.className = "relative flex rounded bg-fill-tertiary dark:bg-fill-tertiary ml-1.5 overflow-visible";

  const group = document.createElement("div");
  group.className = "group flex flex-none items-center justify-center hover:bg-fill-quaternary dark:hover:bg-fill-quaternary rounded";

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "Copy extracted LeetCode input and output");
  button.className = "py-1.5 font-medium items-center whitespace-nowrap focus:outline-none inline-flex relative select-none rounded-none px-3 bg-transparent dark:bg-transparent text-text-primary dark:text-text-primary";
  button.textContent = "Copy IO";
  button.addEventListener("click", handleCopyClick);

  group.appendChild(button);
  root.appendChild(group);

  const insertionPoint = toolbar.children[1] || null;
  toolbar.insertBefore(root, insertionPoint);
}

async function handleCopyClick(event) {
  const button = event.currentTarget;
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Copying...";

    const clipboardText = await collectClipboardText();
    await copyText(clipboardText);

    button.textContent = "Copied";
  } catch (error) {
    console.error("LeetCode Input Copy failed:", error);
    button.textContent = "Error";
    window.alert(error.message || String(error));
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
    }, 1600);
  }
}

async function collectClipboardText() {
  const extractionTarget = await findExtractionTarget();
  if (!extractionTarget) {
    throw new Error("No example blocks found on this LeetCode page.");
  }

  const variableElement = await waitForElement(VARIABLE_SELECTOR);
  if (!variableElement) {
    throw new Error("Missing span.mtk11 element.");
  }

  const variableName = (variableElement.textContent || "").trim();
  if (!variableName) {
    throw new Error("span.mtk11 is empty.");
  }

  const pairs = extractionTarget.blocks.flatMap((block) => parseExampleBlocks(readVisibleText(block)));

  const uniquePairs = dedupePairs(pairs);

  if (uniquePairs.length === 0) {
    throw new Error(`No Input/Output pairs found in ${extractionTarget.source} blocks.`);
  }

  const inputValues = uniquePairs.map((pair) => pair.input);
  const outputValues = uniquePairs.map((pair) => pair.output);
  const parsedInputs = parseInputExamples(inputValues);
  const starterCode = extractStarterCode();
  const treeMetadata = extractTreeMetadata(starterCode);
  return buildClipboardText(starterCode, variableName, parsedInputs, outputValues, treeMetadata);
}

async function findExtractionTarget() {
  const descriptionContainer = await waitForElement(DESCRIPTION_SELECTOR, 1000);
  if (descriptionContainer) {
    const descriptionPreBlocks = findAllWithinRoot(descriptionContainer, ".example-block pre, pre.example-io, pre");
    if (descriptionPreBlocks.length > 0) {
      return { source: "description pre", blocks: descriptionPreBlocks };
    }
  }

  const fallbackBlocks = findFallbackExampleBlocks();
  if (fallbackBlocks.length > 0) {
    return { source: "fallback example", blocks: fallbackBlocks };
  }

  return null;
}

async function waitForElement(selector, timeoutMs = 2500) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const element = document.querySelector(selector) || findFirstDeep(selector);
    if (element) {
      return element;
    }

    await delay(100);
  }

  return null;
}

function findFirstDeep(selector) {
  for (const root of collectSearchRoots(document)) {
    const match = root.querySelector(selector);
    if (match) {
      return match;
    }
  }

  return null;
}

function findAllWithinRoot(rootElement, selector) {
  const matches = [];
  const seen = new Set();

  for (const root of collectSearchRoots(rootElement)) {
    for (const element of root.querySelectorAll(selector)) {
      if (!seen.has(element)) {
        seen.add(element);
        matches.push(element);
      }
    }
  }

  return matches;
}

function findFallbackExampleBlocks() {
  const candidates = [];
  const seen = new Set();

  for (const root of collectSearchRoots(document)) {
    for (const element of root.querySelectorAll("pre, div, p, article, section")) {
      if (seen.has(element)) {
        continue;
      }

      seen.add(element);
      const text = readVisibleText(element);
      if (!looksLikeExampleBlock(text)) {
        continue;
      }

      candidates.push(element);
    }
  }

  return removeNestedMatches(candidates);
}

function dedupePairs(pairs) {
  const seen = new Set();
  const uniquePairs = [];

  for (const pair of pairs) {
    const key = `${pair.input}\n---\n${pair.output}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniquePairs.push(pair);
  }

  return uniquePairs;
}

function looksLikeExampleBlock(text) {
  const normalized = normalizeText(text);
  return normalized.includes("Input:") && normalized.includes("Output:");
}

function removeNestedMatches(elements) {
  return elements.filter((element) => {
    return !elements.some((other) => other !== element && other.contains(element));
  });
}

function collectSearchRoots(startNode) {
  const roots = [];
  const queue = [startNode];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    roots.push(current);

    const elements = current.querySelectorAll ? current.querySelectorAll("*") : [];
    for (const element of elements) {
      if (element.shadowRoot) {
        queue.push(element.shadowRoot);
      }
    }
  }

  return roots;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readVisibleText(element) {
  return normalizeText(element.innerText || element.textContent || "");
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

function parseExampleBlocks(text) {
  const normalized = normalizeText(text);
  const pairs = [];
  const pairPattern = /(?:^|\n)\s*Input:\s*([\s\S]*?)\n\s*Output:\s*([\s\S]*?)(?=(?:\n\s*(?:Example\s*\d+:|Input:|Constraints:|Follow[- ]up:|Note:|Explanation:))|$)/gi;
  let match = pairPattern.exec(normalized);

  while (match) {
    pairs.push({
      input: match[1].trim(),
      output: match[2].trim(),
    });

    match = pairPattern.exec(normalized);
  }

  return pairs;
}

function buildClipboardText(starterCode, variableName, parsedInputs, outputValues, treeMetadata) {
  const formattedOutputs = outputValues.map((value) => normalizeForCodeLiteral(value, false)).join(", ");

  const sections = [];
  if (starterCode) {
    sections.push(starterCode);
    sections.push("");
  }

  if (parsedInputs.mode === "threeValue") {
    const firstInputSeries = formatInputSeries(parsedInputs.firstValues, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.firstName),
      builderPrefix: "treeA",
    });
    const secondInputSeries = formatInputSeries(parsedInputs.secondValues, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.secondName),
      builderPrefix: "treeB",
    });
    const thirdInputSeries = formatInputSeries(parsedInputs.thirdValues, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.thirdName),
      builderPrefix: "treeC",
    });

    if (firstInputSeries.setupLines.length > 0 || secondInputSeries.setupLines.length > 0 || thirdInputSeries.setupLines.length > 0) {
      sections.push('const { buildBinaryTree } = require("./concept/atol");');
      sections.push(...firstInputSeries.setupLines, ...secondInputSeries.setupLines, ...thirdInputSeries.setupLines);
      sections.push("");
    }

    sections.push(...[
      `const a = [${firstInputSeries.formattedValues}];`,
      `const b = [${secondInputSeries.formattedValues}];`,
      `const c = [${thirdInputSeries.formattedValues}];`,
      `const d = [${formattedOutputs}];`,
      "",
      'const help = require("./concept/helper");',
      `help.threeValue(${variableName}, a, b, c, d);`,
    ]);
  } else if (parsedInputs.mode === "twoValue") {
    const firstInputSeries = formatInputSeries(parsedInputs.firstValues, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.firstName),
      builderPrefix: "treeA",
    });
    const secondInputSeries = formatInputSeries(parsedInputs.secondValues, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.secondName),
      builderPrefix: "treeB",
    });

    if (firstInputSeries.setupLines.length > 0 || secondInputSeries.setupLines.length > 0) {
      sections.push('const { buildBinaryTree } = require("./concept/atol");');
      sections.push(...firstInputSeries.setupLines, ...secondInputSeries.setupLines);
      sections.push("");
    }

    sections.push(...[
      `const a = [${firstInputSeries.formattedValues}];`,
      `const b = [${secondInputSeries.formattedValues}];`,
      `const c = [${formattedOutputs}];`,
      "",
      'const help = require("./concept/helper");',
      `help.twoValue(${variableName}, a, b,c);`,
    ]);
  } else if (parsedInputs.mode === "singleNamedValue") {
    const singleInputSeries = formatInputSeries(parsedInputs.values, {
      stripAssignment: false,
      buildBinaryTree: treeMetadata.paramNames.has(parsedInputs.name),
      builderPrefix: "b",
    });

    if (singleInputSeries.setupLines.length > 0) {
      sections.push('const { buildBinaryTree } = require("./concept/atol");');
      sections.push(...singleInputSeries.setupLines);
      sections.push("");
    }

    sections.push(...[
      `const a = [${singleInputSeries.formattedValues}];`,
      `const b = [${formattedOutputs}];`,
      "",
      'const help = require("./concept/helper");',
      `help.singleValue(${variableName}, a, b);`,
    ]);
  } else {
    const singleInputSeries = formatInputSeries(parsedInputs.values, {
      stripAssignment: true,
      buildBinaryTree: treeMetadata.hasBinaryTree && treeMetadata.paramNames.size <= 1,
      builderPrefix: "b",
    });

    if (singleInputSeries.setupLines.length > 0) {
      sections.push('const { buildBinaryTree } = require("./concept/atol");');
      sections.push(...singleInputSeries.setupLines);
      sections.push("");
    }

    sections.push(...[
      `const a = [${singleInputSeries.formattedValues}];`,
      `const b = [${formattedOutputs}];`,
      "",
      'const help = require("./concept/helper");',
      `help.singleValue(${variableName}, a, b);`,
    ]);
  }

  return sections.join("\n");
}

function parseInputExamples(inputValues) {
  const parsedExamples = inputValues.map((value) => parseNamedAssignments(value));
  if (parsedExamples.some((example) => example === null)) {
    return {
      mode: "singleValue",
      values: inputValues,
    };
  }

  const firstExample = parsedExamples[0];
  if (!firstExample || firstExample.length === 0) {
    return {
      mode: "singleValue",
      values: inputValues,
    };
  }

  if (firstExample.length === 1) {
    const [firstAssignment] = firstExample;
    const values = [];

    for (const example of parsedExamples) {
      if (!example || example.length !== 1 || example[0].name !== firstAssignment.name) {
        return {
          mode: "singleValue",
          values: inputValues,
        };
      }

      values.push(example[0].value);
    }

    return {
      mode: "singleNamedValue",
      name: firstAssignment.name,
      values,
    };
  }

  if (firstExample.length === 3) {
    const [firstName, secondName, thirdName] = firstExample.map((entry) => entry.name);
    const firstValues = [];
    const secondValues = [];
    const thirdValues = [];

    for (const example of parsedExamples) {
      if (!example || example.length !== 3) {
        return {
          mode: "singleValue",
          values: inputValues,
        };
      }

      if (example[0].name !== firstName || example[1].name !== secondName || example[2].name !== thirdName) {
        return {
          mode: "singleValue",
          values: inputValues,
        };
      }

      firstValues.push(example[0].value);
      secondValues.push(example[1].value);
      thirdValues.push(example[2].value);
    }

    return {
      mode: "threeValue",
      firstName,
      secondName,
      thirdName,
      firstValues,
      secondValues,
      thirdValues,
    };
  }

  if (firstExample.length !== 2) {
    return {
      mode: "singleValue",
      values: inputValues,
    };
  }

  const [firstName, secondName] = firstExample.map((entry) => entry.name);
  const firstValues = [];
  const secondValues = [];

  for (const example of parsedExamples) {
    if (!example || example.length !== 2) {
      return {
        mode: "singleValue",
        values: inputValues,
      };
    }

    if (example[0].name !== firstName || example[1].name !== secondName) {
      return {
        mode: "singleValue",
        values: inputValues,
      };
    }

    firstValues.push(example[0].value);
    secondValues.push(example[1].value);
  }

  return {
    mode: "twoValue",
    firstName,
    secondName,
    firstValues,
    secondValues,
  };
}

function extractTreeMetadata(starterCode) {
  const paramNames = new Set();
  const paramPattern = /@param\s*\{\s*TreeNode(?:\s*\[\s*\])?\s*\}\s*([A-Za-z_$][\w$]*)/g;
  let match = paramPattern.exec(starterCode);

  while (match) {
    paramNames.add(match[1]);
    match = paramPattern.exec(starterCode);
  }

  return {
    hasBinaryTree: /\bTreeNode\b/.test(starterCode),
    paramNames,
  };
}

function formatInputSeries(values, options) {
  const { stripAssignment, buildBinaryTree, builderPrefix } = options;

  if (!buildBinaryTree || !values.every((value) => isArrayLikeInput(getRightHandValue(normalizeText(value))))) {
    return {
      setupLines: [],
      formattedValues: values.map((value) => normalizeForCodeLiteral(value, stripAssignment)).join(", "),
    };
  }

  const setupLines = [];
  const refs = [];

  values.forEach((value, index) => {
    const refName = `${builderPrefix}${index + 1}`;
    const arrayLiteral = normalizeForCodeLiteral(value, stripAssignment);
    setupLines.push(`const ${refName} = buildBinaryTree(${arrayLiteral});`);
    refs.push(refName);
  });

  return {
    setupLines,
    formattedValues: refs.join(", "),
  };
}

function isArrayLikeInput(value) {
  return /^\[[\s\S]*\]$/.test(value.trim());
}

function parseNamedAssignments(text) {
  const parts = splitTopLevelByComma(normalizeText(text));
  if (parts.length === 0) {
    return null;
  }

  // Single part: standard parsing or single unnamed value
  if (parts.length === 1) {
    const match = parts[0].match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/);
    return match ? [{ name: match[1], value: match[2].trim() }] : null;
  }

  // Multiple parts: allow mixed named/unnamed format
  const assignments = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const match = part.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/);
    if (match) {
      assignments.push({
        name: match[1],
        value: match[2].trim(),
      });
    } else {
      // Generate a name based on position for unnamed parameters
      assignments.push({
        name: `_${i}`,
        value: part.trim(),
      });
    }
  }

  // If we have at least 2 parts and at least one has an explicit name, treat as multi-valued
  const hasExplicitName = assignments.some(a => !a.name.startsWith('_'));
  if (parts.length >= 2 && hasExplicitName) {
    return assignments;
  }

  // Otherwise, treat as single unnamed value
  return null;
}

function splitTopLevelByComma(text) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    if (quote) {
      current += char;
      if (char === quote && prev !== "\\") {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }

      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function extractStarterCode() {
  const editorLineContainers = Array.from(document.querySelectorAll(".monaco-editor .view-lines"));
  if (editorLineContainers.length === 0) {
    return "";
  }

  const bestContainer = editorLineContainers
    .filter((container) => isElementVisible(container))
    .sort((a, b) => b.querySelectorAll(".view-line").length - a.querySelectorAll(".view-line").length)[0];

  if (!bestContainer) {
    return "";
  }

  const lineElements = Array.from(bestContainer.querySelectorAll(".view-line"));
  if (lineElements.length === 0) {
    return "";
  }

  const lines = lineElements.map((lineElement) => {
    const text = (lineElement.textContent || "").replace(/\u00a0/g, " ");
    return text.replace(/\s+$/g, "");
  });

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n").trimEnd();
}

function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalizeForCodeLiteral(value, stripAssignment) {
  const trimmed = normalizeText(value);
  const candidate = stripAssignment ? getRightHandValue(trimmed) : trimmed;
  return toCodeLiteral(candidate);
}

function getRightHandValue(value) {
  const assignmentMatch = value.match(/^[A-Za-z_$][\w$]*\s*=\s*([\s\S]+)$/);
  if (!assignmentMatch) {
    return value;
  }

  return assignmentMatch[1].trim();
}

function toCodeLiteral(value) {
  const raw = value.trim();
  if (!raw) {
    return '""';
  }

  if (looksLikeLiteral(raw)) {
    return raw;
  }

  return JSON.stringify(raw);
}

function looksLikeLiteral(value) {
  const quotedString = /^"(?:[^"\\]|\\.)*"$|^'(?:[^'\\]|\\.)*'$/;
  const numberLiteral = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
  const simpleKeyword = /^(?:true|false|null|undefined)$/;
  const structured = /^(?:\[[\s\S]*\]|\{[\s\S]*\}|\([\s\S]*\))$/;

  return (
    quotedString.test(value) ||
    numberLiteral.test(value) ||
    simpleKeyword.test(value) ||
    structured.test(value)
  );
}

async function copyText(text) {
  if (document.hasFocus() && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Copy failed. Click inside the page and try again.");
  }
}