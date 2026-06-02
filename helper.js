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
};
