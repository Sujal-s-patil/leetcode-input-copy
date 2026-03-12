returned output
```js
const a = [[73,74,75,71,69,72,76,73], [30,40,50,60], [30,60,90]];
const b = [[1,1,4,2,1,1,0,0], [1,1,1,0], [1,1,0]];

const help = require("./concept/helper");
help.singleValue(dailyTemperatures, a, b);
```

expected output 
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
var isBalanced = function (root) {
    function dfs(root) {
        if (!root) return 0

        let left = dfs(root.left)
        if (left === -1) return -1

        let right = dfs(root.right)
        if (right === -1) return -1

        if (Math.abs(left - right) > 1) return -1

        return 1+Math.max(left, right)
    }

    return dfs(root) !== -1

};

const a = [[3,9,20,null,null,15,7],[1,2,2,3,3,null,null,4,4],[]];
const b = [true,false,true];

const help = require("./concept/helper");
help.singleValue(isBalanced, a, b);
```




