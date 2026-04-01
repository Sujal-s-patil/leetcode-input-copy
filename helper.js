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
function twoValue(func, a, b, c) {
    for (let i = 0; i < a.length; i++) {
        const ans = func(a[i], b[i]);
        compareAndLog(ans, c[i]);
    }
}

function singleValue(func, a, b) {
    for (let i = 0; i < a.length; i++) {
        const ans = func(a[i]);
        compareAndLog(ans, b[i]);
    }
}

function threeValue(func, a, b, c, d) {
    for (let i = 0; i < a.length; i++) {
        const ans = func(a[i], b[i], c[i]);
        compareAndLog(ans, d[i]);
    }
}

module.exports = {
    twoValue,
    singleValue,
    threeValue,
};
