// ─── Constants ───────────────────────────────────────────────────────────────
const BUTTON_ROOT_ID = "leetcode-input-copy-root";
const BUTTON_ID = "leetcode-input-copy-button";
const TOOLBAR_SELECTOR = "#ide-top-btns";
const VARIABLE_SELECTOR = "span.mtk11";
const DESCRIPTION_SELECTOR = ".elfjS, .elfjs, [data-track-load='description_content']";
const RESET_DELAY_MS = 1600;
const WAIT_TIMEOUT_MS = 2500;
const DESC_WAIT_TIMEOUT_MS = 1000;

const PAIR_PATTERN = /(?:^|\n)\s*Input:\s*([\s\S]*?)\n\s*Output:\s*([\s\S]*?)(?=(?:\n\s*(?:Example\s*\d+:|Input:|Constraints:|Follow[- ]up:|Note:|Explanation:))|$)/gi;
const ASSIGNMENT_PATTERN = /^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/;
const PARAM_PATTERN = /@param\s*\{\s*TreeNode(?:\s*\[\s*\])?\s*\}\s*([A-Za-z_$][\w$]*)/g;
const LIST_PARAM_PATTERN = /@param\s*\{\s*ListNode(?:\s*\[\s*\])?\s*\}\s*([A-Za-z_$][\w$]*)/g;

let mountScheduled = false;

// ─── Bootstrap ───────────────────────────────────────────────────────────────
init();

function init() {
  mountButton();

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// ─── Mount helpers ────────────────────────────────────────────────────────────
function scheduleMount() {
  if (mountScheduled) return;
  mountScheduled = true;
  requestAnimationFrame(() => {
    mountScheduled = false;
    mountButton();
  });
}

function mountButton() {
  const toolbar = document.querySelector(TOOLBAR_SELECTOR);
  if (!toolbar) return;

  const existingRoot = document.getElementById(BUTTON_ROOT_ID);
  if (existingRoot) {
    if (existingRoot.parentElement !== toolbar) existingRoot.remove();
    else return;
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
  toolbar.insertBefore(root, toolbar.children[1] ?? null);
}

// ─── Click handler ────────────────────────────────────────────────────────────
async function handleCopyClick(event) {
  const btn = event.currentTarget;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Copying...";

  try {
    const text = await collectClipboardText();
    await copyText(text);
    btn.textContent = "Copied";
  } catch (err) {
    console.error("LeetCode Input Copy failed:", err);
    btn.textContent = "Error";
    window.alert(err.message ?? String(err));
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
    }, RESET_DELAY_MS);
  }
}

// ─── Core clipboard text assembly ─────────────────────────────────────────────
async function collectClipboardText() {
  const [extractionTarget, variableElement] = await Promise.all([
    findExtractionTarget(),
    waitForElement(VARIABLE_SELECTOR),
  ]);

  if (!extractionTarget) throw new Error("No example blocks found on this LeetCode page.");
  if (!variableElement) throw new Error("Missing span.mtk11 element.");

  const variableName = variableElement.textContent?.trim();
  if (!variableName) throw new Error("span.mtk11 is empty.");

  const rawPairs = extractionTarget.blocks.flatMap((block) => parseExampleBlocks(readVisibleText(block)));
  const pairs = dedupePairs(rawPairs);

  if (pairs.length === 0) {
    throw new Error(`No Input/Output pairs found in ${extractionTarget.source} blocks.`);
  }

  const inputValues = pairs.map((p) => p.input);
  const outputValues = pairs.map((p) => p.output);
  const parsedInputs = parseInputExamples(inputValues);
  const starterCode = extractStarterCode();
  const treeMeta = extractTreeMetadata(starterCode);

  return buildClipboardText(starterCode, variableName, parsedInputs, outputValues, treeMeta);
}

// ─── DOM search helpers ───────────────────────────────────────────────────────
async function findExtractionTarget() {
  const descContainer = await waitForElement(DESCRIPTION_SELECTOR, DESC_WAIT_TIMEOUT_MS);
  if (descContainer) {
    const blocks = findAllWithinRoot(descContainer, ".example-block pre, pre.example-io, pre");
    if (blocks.length > 0) return { source: "description pre", blocks };
  }

  const fallback = findFallbackExampleBlocks();
  return fallback.length > 0 ? { source: "fallback example", blocks: fallback } : null;
}

async function waitForElement(selector, timeoutMs = WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let pollDelay = 50;

  while (Date.now() < deadline) {
    const el = document.querySelector(selector) ?? findFirstDeep(selector);
    if (el) return el;
    await delay(pollDelay);
    pollDelay = Math.min(pollDelay + 25, 200);
  }
  return null;
}

function findFirstDeep(selector) {
  for (const root of collectSearchRoots(document)) {
    const match = root.querySelector(selector);
    if (match) return match;
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
    for (const el of root.querySelectorAll("pre, div, p, article, section")) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (looksLikeExampleBlock(readVisibleText(el))) candidates.push(el);
    }
  }
  return removeNestedMatches(candidates);
}

function collectSearchRoots(startNode) {
  const roots = [startNode];
  const visited = new WeakSet([startNode]);
  const queue = [startNode];
  let i = 0;

  while (i < queue.length) {
    const current = queue[i++];
    if (!current.querySelectorAll) continue;

    for (const element of current.querySelectorAll("*")) {
      if (element.shadowRoot && !visited.has(element.shadowRoot)) {
        visited.add(element.shadowRoot);
        roots.push(element.shadowRoot);
        queue.push(element.shadowRoot);
      }
    }
  }
  return roots;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readVisibleText(element) {
  return normalizeText(element.innerText ?? element.textContent ?? "");
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────
function parseExampleBlocks(text) {
  const normalized = normalizeText(text);
  const pairs = [];
  let match;
  PAIR_PATTERN.lastIndex = 0;
  while ((match = PAIR_PATTERN.exec(normalized)) !== null) {
    pairs.push({ input: match[1].trim(), output: match[2].trim() });
  }
  return pairs;
}

function dedupePairs(pairs) {
  const seen = new Set();
  const result = [];
  for (const pair of pairs) {
    const key = `${pair.input}\n---\n${pair.output}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(pair);
    }
  }
  return result;
}

function looksLikeExampleBlock(text) {
  const n = normalizeText(text);
  const idx = n.indexOf("Input:");
  return idx !== -1 && n.indexOf("Output:", idx) !== -1;
}

function removeNestedMatches(elements) {
  return elements.filter((el, i) =>
    !elements.some((other, j) => i !== j && other.contains(el))
  );
}

// ─── Input parsing ────────────────────────────────────────────────────────────
function parseInputExamples(inputValues) {
  const parsed = inputValues.map(parseNamedAssignments);

  if (parsed.some((p) => p === null)) {
    return { mode: "singleValue", values: inputValues };
  }

  const first = parsed[0];
  if (!first?.length) return { mode: "singleValue", values: inputValues };

  const names = first.map((e) => e.name);
  const valuesByIndex = names.map(() => []);

  for (const example of parsed) {
    if (!example || example.length !== names.length) {
      return { mode: "singleValue", values: inputValues };
    }
    for (let i = 0; i < names.length; i++) {
      if (example[i].name !== names[i]) return { mode: "singleValue", values: inputValues };
      valuesByIndex[i].push(example[i].value);
    }
  }

  return { mode: "namedMulti", names, valuesByIndex };
}

function parseNamedAssignments(text) {
  const parts = splitTopLevelByComma(normalizeText(text));
  if (parts.length === 0) return null;

  if (parts.length === 1) {
    const match = ASSIGNMENT_PATTERN.exec(parts[0]);
    return match ? [{ name: match[1], value: match[2].trim() }] : null;
  }

  const assignments = [];
  let hasExplicitName = false;

  for (let i = 0; i < parts.length; i++) {
    const match = ASSIGNMENT_PATTERN.exec(parts[i]);
    if (match) {
      assignments.push({ name: match[1], value: match[2].trim() });
      hasExplicitName = true;
    } else {
      assignments.push({ name: `_${i}`, value: parts[i].trim() });
    }
  }

  return parts.length >= 2 && hasExplicitName ? assignments : null;
}

function splitTopLevelByComma(text) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    if (quote) {
      current += ch;
      if (ch === quote && prev !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "(" || ch === "[" || ch === "{") { depth++; current += ch; continue; }
    if (ch === ")" || ch === "]" || ch === "}") { depth = Math.max(0, depth - 1); current += ch; continue; }
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ─── Tree / LinkedList metadata ───────────────────────────────────────────────
function extractTreeMetadata(starterCode) {
  const paramNames = new Set();
  const listParamNames = new Set();
  PARAM_PATTERN.lastIndex = 0;
  LIST_PARAM_PATTERN.lastIndex = 0;

  let match;
  while ((match = PARAM_PATTERN.exec(starterCode)) !== null) paramNames.add(match[1]);
  while ((match = LIST_PARAM_PATTERN.exec(starterCode)) !== null) listParamNames.add(match[1]);

  return {
    hasBinaryTree: /\bTreeNode\b/.test(starterCode),
    hasLinkedList: /\bListNode\b/.test(starterCode),
    paramNames,
    listParamNames,
  };
}

function shouldBuildLinkedList(name, value, meta) {
  if (!isArrayLikeInput(getRightHandValue(normalizeText(value)))) return false;
  if (meta.listParamNames.has(name)) return true;
  if (!meta.hasLinkedList) return false;
  return /^(?:head|head[A-Z0-9_].*|list|list[A-Z0-9_].*|l\d+)$/i.test(name);
}

// ─── Code builders ────────────────────────────────────────────────────────────
function buildClipboardText(starterCode, variableName, parsedInputs, outputValues, treeMeta) {
  const formattedOutputs = outputValues
    .map((v) => normalizeForCodeLiteral(v, false))
    .join(", ");

  const sections = [];
  if (starterCode) { sections.push(starterCode, ""); }

  const { mode } = parsedInputs;

  if (mode === "namedMulti") {
    const inputSeries = parsedInputs.names.map((name, i) =>
      formatInputSeries(parsedInputs.valuesByIndex[i], {
        stripAssignment: false,
        buildBinaryTree: treeMeta.paramNames.has(name),
        buildLinkedList: parsedInputs.valuesByIndex[i].every(
          (v) => shouldBuildLinkedList(name, v, treeMeta)
        ),
        builderPrefix: `p${i + 1}_`,
      })
    );
    appendHelperImports(sections, inputSeries);
    sections.push(...inputSeries.flatMap((s) => s.setupLines));
    if (inputSeries.some((s) => s.setupLines.length > 0)) sections.push("");

    const inputVarNames = inputSeries.map((_, i) => getSeriesVariableName(i));
    const outputVarName = getSeriesVariableName(inputSeries.length);
    inputSeries.forEach((s, i) => sections.push(`const ${inputVarNames[i]} = [${s.formattedValues}];`));
    sections.push(`const ${outputVarName} = [${formattedOutputs}];`, "");
    sections.push('const help = require("./concept/helper");');
    sections.push(`help.multiValue(${variableName}, [${inputVarNames.join(", ")}], ${outputVarName});`);
    return sections.join("\n");
  }

  // twoValue / threeValue / singleNamedValue / singleValue
  const seriesConfig = buildSeriesConfig(parsedInputs, treeMeta);
  appendHelperImports(sections, seriesConfig.series);
  seriesConfig.series.forEach((s) => sections.push(...s.setupLines));
  if (seriesConfig.series.some((s) => s.setupLines.length > 0)) sections.push("");

  seriesConfig.varLines.forEach((line) => sections.push(line));
  sections.push(`const ${getSeriesVariableName(seriesConfig.series.length)} = [${formattedOutputs}];`, "");
  sections.push('const help = require("./concept/helper");');
  sections.push(`help.multiValue(${variableName}, [${seriesConfig.inputVarNames.join(", ")}], ${getSeriesVariableName(seriesConfig.series.length)});`);

  return sections.join("\n");
}

function buildSeriesConfig(parsedInputs, treeMeta) {
  const { mode } = parsedInputs;

  const makeOpts = (name, values, prefix, stripAssignment) => ({
    stripAssignment,
    buildBinaryTree: treeMeta.paramNames.has(name),
    buildLinkedList: values.every((v) => shouldBuildLinkedList(name, v, treeMeta)),
    builderPrefix: prefix,
  });

  let rawSeries;
  if (mode === "threeValue") {
    rawSeries = [
      { name: parsedInputs.firstName, values: parsedInputs.firstValues, prefix: "treeA", strip: false },
      { name: parsedInputs.secondName, values: parsedInputs.secondValues, prefix: "treeB", strip: false },
      { name: parsedInputs.thirdName, values: parsedInputs.thirdValues, prefix: "treeC", strip: false },
    ];
  } else if (mode === "twoValue") {
    rawSeries = [
      { name: parsedInputs.firstName, values: parsedInputs.firstValues, prefix: "treeA", strip: false },
      { name: parsedInputs.secondName, values: parsedInputs.secondValues, prefix: "treeB", strip: false },
    ];
  } else if (mode === "singleNamedValue") {
    // A named param exists (e.g. "root = [1,2,3]") — resolve tree/list-ness by
    // matching this specific param name, same as threeValue/twoValue/namedMulti.
    rawSeries = [{ name: parsedInputs.name, values: parsedInputs.values, prefix: "b", strip: false }];
  } else {
    // singleValue: no param name available, fall back to a signature-wide heuristic.
    const bTree = treeMeta.hasBinaryTree && treeMeta.paramNames.size <= 1;
    const lList = treeMeta.hasLinkedList && treeMeta.listParamNames.size <= 1;
    rawSeries = [{ name: "", values: parsedInputs.values, prefix: "b", strip: true, bTree, lList }];
  }

  const series = rawSeries.map(({ name, values, prefix, strip, bTree, lList }) => {
    const opts = makeOpts(name, values, prefix, strip);
    if (bTree !== undefined) { opts.buildBinaryTree = bTree; opts.buildLinkedList = lList; }
    return formatInputSeries(values, opts);
  });

  const inputVarNames = series.map((_, i) => getSeriesVariableName(i));
  const varLines = series.map((s, i) => `const ${inputVarNames[i]} = [${s.formattedValues}];`);

  return { series, inputVarNames, varLines };
}

function appendHelperImports(sections, series) {
  if (series.some((s) => s.usesBinaryTree)) sections.push('const { buildBinaryTree } = require("./concept/helper");');
  if (series.some((s) => s.usesLinkedList)) sections.push('const { arrayToLinkedList } = require("./concept/helper");');
  if (sections.length > 0 && (series.some((s) => s.usesBinaryTree || s.usesLinkedList))) sections.push("");
}

function formatInputSeries(values, options) {
  const { stripAssignment, buildBinaryTree, buildLinkedList, builderPrefix } = options;
  const usesBinaryTree = buildBinaryTree && values.every((v) => isArrayLikeInput(getRightHandValue(normalizeText(v))));
  const usesLinkedList = !usesBinaryTree && buildLinkedList && values.every((v) => isArrayLikeInput(getRightHandValue(normalizeText(v))));

  if (!usesBinaryTree && !usesLinkedList) {
    return {
      setupLines: [],
      formattedValues: values.map((v) => normalizeForCodeLiteral(v, stripAssignment)).join(", "),
      usesBinaryTree: false,
      usesLinkedList: false,
    };
  }

  const fn = usesBinaryTree ? "buildBinaryTree" : "arrayToLinkedList";
  const setupLines = [];
  const refs = [];

  values.forEach((v, i) => {
    const ref = `${builderPrefix}${i + 1}`;
    const literal = normalizeForCodeLiteral(v, stripAssignment);
    setupLines.push(`const ${ref} = ${fn}(${literal});`);
    refs.push(ref);
  });

  return { setupLines, formattedValues: refs.join(", "), usesBinaryTree, usesLinkedList };
}

// ─── Value / literal helpers ──────────────────────────────────────────────────
function getSeriesVariableName(index) {
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  let name = "";
  let val = index;
  do {
    name = alpha[val % 26] + name;
    val = Math.floor(val / 26) - 1;
  } while (val >= 0);
  return name;
}

function isArrayLikeInput(value) {
  return /^\[[\s\S]*\]$/.test(value.trim());
}

function getRightHandValue(value) {
  const m = value.match(/^[A-Za-z_$][\w$]*\s*=\s*([\s\S]+)$/);
  return m ? m[1].trim() : value;
}

function normalizeForCodeLiteral(value, stripAssignment) {
  const trimmed = normalizeText(value);
  const candidate = stripAssignment ? getRightHandValue(trimmed) : trimmed;
  return toCodeLiteral(candidate);
}

function toCodeLiteral(value) {
  const raw = value.trim();
  if (!raw) return '""';
  return looksLikeLiteral(raw) ? raw : JSON.stringify(raw);
}

function looksLikeLiteral(value) {
  const c = value[0];
  if (c === '"' || c === "'") return /^["'](?:[^\\"']|\\.)*["']$/.test(value);
  if (c === "[" || c === "{" || c === "(") return true;
  if (c === "t" || c === "f" || c === "n" || c === "u") return /^(?:true|false|null|undefined)$/.test(value);
  if (c === "-" || (c >= "0" && c <= "9")) return /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(value);
  return false;
}

// ─── Starter code extraction ──────────────────────────────────────────────────
function extractStarterCode() {
  const containers = Array.from(document.querySelectorAll(".monaco-editor .view-lines"))
    .filter(isElementVisible)
    .sort((a, b) => b.querySelectorAll(".view-line").length - a.querySelectorAll(".view-line").length);

  const best = containers[0];
  if (!best) return "";

  const lines = Array.from(best.querySelectorAll(".view-line"))
    .map((el) => (el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+$/g, ""));

  while (lines.length > 0 && !lines[lines.length - 1]) lines.pop();
  return lines.join("\n").trimEnd();
}

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// ─── Clipboard ───────────────────────────────────────────────────────────────
async function copyText(text) {
  if (document.hasFocus() && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { }
  }

  const ta = Object.assign(document.createElement("textarea"), {
    value: text,
    readOnly: true,
  });
  Object.assign(ta.style, { position: "fixed", top: "0", left: "0", opacity: "0" });
  document.body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(0, ta.value.length);

  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("Copy failed. Click inside the page and try again.");
}