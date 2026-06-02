const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function compareAndLog(result, expected) {
    const isArray = Array.isArray(expected);
    const resultStr = isArray ? JSON.stringify(result) : String(result);
    const expectedStr = isArray ? JSON.stringify(expected) : String(expected);
    const match = resultStr === expectedStr;
    const color = match ? GREEN : RED;
    const resultDisplay = isArray ? `[${result}]` : result;
    const expectedDisplay = isArray ? `[${expected}]` : expected;
    console.log(`${color}${resultDisplay} <--> ${expectedDisplay}${RESET}`);
}

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

function buildBinaryTree(arr) {
    if (!arr.length) return null;

    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;

    while (i < arr.length) {
        let current = queue.shift();

        if (current) {
            if (arr[i] !== null && arr[i] !== undefined) {
                current.left = new TreeNode(arr[i]);
                queue.push(current.left);
            }
            i++;

            if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
                current.right = new TreeNode(arr[i]);
                queue.push(current.right);
            }
            i++;
        }
    }

    return root;
}

function arrayToLinkedList(arr) {
    if (arr.length === 0) return null;

    let dummy = new ListNode(0);
    let current = dummy;

    for (let num of arr) {
        current.next = new ListNode(num);
        current = current.next;
    }

    return dummy.next;
}

function multiValue(func, inputSeries, expected) {
    if (!Array.isArray(inputSeries) || inputSeries.length === 0) {
        throw new Error("multiValue expects a non-empty array of input arrays.");
    }

    const testCount = expected.length;

    for (let i = 0; i < testCount; i++) {
        const args = inputSeries.map((series) => series[i]);
        const ans = func(...args);
        compareAndLog(ans, expected[i]);
    }
}

module.exports = {
    multiValue,
    buildBinaryTree,
    arrayToLinkedList,
    TreeNode,
    ListNode,
};
