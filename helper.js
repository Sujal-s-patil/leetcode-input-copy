// ─── ANSI colors ──────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// ─── Logging ──────────────────────────────────────────────────────────────────
function compareAndLog(result, expected) {
    const normalized = normalizeForCompare(result, expected);
    const isArray = Array.isArray(expected) || Array.isArray(normalized);
    const resultStr = isArray ? JSON.stringify(normalized) : String(normalized);
    const expectedStr = isArray ? JSON.stringify(expected) : String(expected);
    const match = resultStr === expectedStr;
    const color = match ? GREEN : RED;
    const tag = match ? "PASS" : "FAIL";

    console.log(`${color}[${tag}] got: ${resultStr}  expected: ${expectedStr}${RESET}`);
    return match;
}

// ─── Data structures ──────────────────────────────────────────────────────────
class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}

class TreeNode {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}

// ─── Tree builder (BFS level-order, null-safe) ────────────────────────────────
function buildBinaryTree(arr) {
    if (!arr.length) return null;

    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;

    while (i < arr.length) {
        const node = queue.shift();
        if (!node) { i += 2; continue; }

        if (arr[i] != null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        i++;

        if (i < arr.length && arr[i] != null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
        i++;
    }
    return root;
}

// ─── Linked list builder ──────────────────────────────────────────────────────
function arrayToLinkedList(arr) {
    if (!arr.length) return null;
    const dummy = new ListNode(0);
    let cur = dummy;
    for (const num of arr) { cur.next = new ListNode(num); cur = cur.next; }
    return dummy.next;
}

// ─── Reverse converters (node -> array, for comparison against expected) ──────
function linkedListToArray(node) {
    const result = [];
    while (node) {
        result.push(node.val);
        node = node.next;
    }
    return result;
}

function binaryTreeToArray(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length) {
        const node = queue.shift();
        if (node) {
            result.push(node.val);
            queue.push(node.left ?? null);
            queue.push(node.right ?? null);
        } else {
            result.push(null);
        }
    }

    while (result.length && result[result.length - 1] === null) result.pop();
    return result;
}

// ─── Shape detection ────────────────────────────────────────────────────────
// Duck-typed on purpose: LeetCode solution files define their own ListNode/
// TreeNode classes, so `instanceof` against this file's classes won't match.
function isListNodeLike(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && "val" in value && "next" in value;
}

function isTreeNodeLike(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && "val" in value && "left" in value && "right" in value;
}

function normalizeForCompare(value, expected) {
    if (value === null) return Array.isArray(expected) ? [] : value;
    if (isTreeNodeLike(value)) return binaryTreeToArray(value);
    if (isListNodeLike(value)) return linkedListToArray(value);
    return value;
}

// ─── Test runner ──────────────────────────────────────────────────────────────
function multiValue(func, inputSeries, expected) {
    if (!Array.isArray(inputSeries) || inputSeries.length === 0) {
        throw new Error("multiValue expects a non-empty array of input arrays.");
    }
    const total = expected.length;
    let passed = 0;

    for (let i = 0; i < total; i++) {
        const args = inputSeries.map((series) => series[i]);
        const result = func(...args);
        if (compareAndLog(result, expected[i])) passed++;
    }

    const color = passed === total ? GREEN : RED;
    console.log(`\n${color}${passed}/${total} tests passed${RESET}`);
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    multiValue,
    buildBinaryTree,
    arrayToLinkedList,
    linkedListToArray,
    binaryTreeToArray,
    TreeNode,
    ListNode,
};