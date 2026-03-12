const BUTTON_ROOT_ID = "leetcode-input-copy-root";
const BUTTON_ID = "leetcode-input-copy-button";
const TOOLBAR_SELECTOR = "#ide-top-btns";
const VARIABLE_SELECTOR = "span.mtk11";
const DESCRIPTION_SELECTOR = ".elfjS, .elfjs, [data-track-load='description_content']";

init();

function init() {
  mountButton();

  const observer = new MutationObserver(() => {
    mountButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
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

  const pairs = extractionTarget.blocks
    .map((block) => parseExampleBlock(readVisibleText(block)))
    .filter(Boolean);

  const uniquePairs = dedupePairs(pairs);

  if (uniquePairs.length === 0) {
    throw new Error(`No Input/Output pairs found in ${extractionTarget.source} blocks.`);
  }

  const inputValues = uniquePairs.map((pair) => pair.input);
  const outputValues = uniquePairs.map((pair) => pair.output);
  return buildClipboardText(variableName, inputValues, outputValues);
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
    const element = findFirstDeep(selector);
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

function parseExampleBlock(text) {
  const normalized = normalizeText(text);
  const inputMatch = normalized.match(/(?:^|\n)Input:\s*([\s\S]*?)(?=\nOutput:|$)/i);
  const outputMatch = normalized.match(/(?:^|\n)Output:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z ]*:|$)/i);

  if (!inputMatch || !outputMatch) {
    return null;
  }

  return {
    input: inputMatch[1].trim(),
    output: outputMatch[1].trim(),
  };
}

function buildClipboardText(variableName, inputValues, outputValues) {
  const formattedInputs = inputValues.map((value) => normalizeForCodeLiteral(value, true)).join(", ");
  const formattedOutputs = outputValues.map((value) => normalizeForCodeLiteral(value, false)).join(", ");

  return [
    `const a = [${formattedInputs}];`,
    `const b = [${formattedOutputs}];`,
    "",
    'const help = require("./concept/helper");',
    `help.singleValue(${variableName}, a, b);`,
  ].join("\n");
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