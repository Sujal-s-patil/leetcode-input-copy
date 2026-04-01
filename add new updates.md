add it to make the binary tree from array

```js
/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isValidBST = function (root) {
    function dfs(root, min, max) {
        if (!root) return true;
        if (root.val >= max || root.val <= min) return false;
        return dfs(root.left, min, node.val) && dfs(root.right, node.val, max);
    }

    return dfs(root, -Infinity, Infinity);
};

const { buildBinaryTree } = require("./concept/atol");
const b1 = buildBinaryTree([2, 1, 3]);
const b2 = buildBinaryTree([5, 1, 4, null, null, 3, 6]);

const a = [b1, b2];
const b = [true, false];

const help = require("./concept/helper");
help.singleValue(isValidBST, a, b);
```


