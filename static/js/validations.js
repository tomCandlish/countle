// Add 'export' to these two functions
export function isNumber(value) {
    return typeof value === "number" || !isNaN(Number(value));
}

export function isOperator(value) {
    return ["+", "-", "×", "÷"].includes(value);
}

function unwrap(v) {
    return (v && typeof v === "object" && "value" in v) ? v.value : v;
}

export function canAppend(lastValue, newValue) {
    // ... existing logic ...
    lastValue = unwrap(lastValue);
    newValue = unwrap(newValue);

    const lastIsNum = isNumber(lastValue);
    const lastIsOp = isOperator(lastValue);
    const newIsNum = isNumber(newValue);
    const newIsOp = isOperator(newValue);

    if (lastValue == null) {
        return newIsNum;
    }

    if (lastIsNum && newIsNum) return false;
    if (lastIsOp && newIsOp) return false;
    if (lastIsNum && newIsOp) return true;
    if (lastIsOp && newIsNum) return true;

    return false;
}
export function isValidExpression(expr) {
    const items = Object.keys(expr)
        .sort((a, b) => Number(a) - Number(b))
        .map(k => unwrap(expr[k]));

    // 1. Minimum length rule: We need "Number Operator Number" (length 3) to calculate anything.
    if (items.length < 3) return false;

    // 2. Odd vs Even rule:
    // Because we enforce alternating "Num Op Num", 
    // Odd length = Ends in Number (Valid)
    // Even length = Ends in Operator (Invalid)
    if (items.length % 2 === 0) return false;

    // 3. Safety check: Ensure the last item is actually a number
    const lastItem = items[items.length - 1];
    if (!isNumber(lastItem)) return false;

    return true;
}
