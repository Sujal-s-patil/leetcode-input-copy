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
    twoValue,
    singleValue,
    threeValue,
    multiValue,
};
