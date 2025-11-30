/**
 * Checks if a value is a standard JavaScript number or can be parsed as one.
 * * @param {any} value - The value to check.
 * @returns {boolean} True if the value is number-like.
 */
export function isNumber(value) {
    return typeof value === "number" || !isNaN(Number(value));
}

/**
 * Checks if a value is one of the supported arithmetic operators.
 * * @param {any} value - The value to check.
 * @returns {boolean} True if the value is an operator string.
 */
export function isOperator(value) {
    return ["+", "-", "×", "÷"].includes(value);
}

/**
 * Unwraps an expression object to extract its calculated numeric value.
 * This is used when performing structural checks on expression contents.
 * * @param {any} v - The item, which may be a primitive (number/string) or an expression object.
 * @returns {any} The underlying value (number or string) or the input if it's not an object.
 */
export function unwrap(v) {
    return (v && typeof v === "object" && "value" in v) ? v.value : v;
}

/**
 * Determines if a new value can be appended after the last value in the expression.
 * This enforces the alternating sequence rule (Number -> Operator -> Number).
 * * @param {any} lastValue - The last item currently in the expression.
 * @param {any} newValue - The item the user is trying to add.
 * @returns {boolean} True if the append operation is structurally valid.
 */
export function canAppend(lastValue, newValue) {
    const lastUnwrapped = unwrap(lastValue);
    const newUnwrapped = unwrap(newValue);

    const lastIsNum = isNumber(lastUnwrapped);
    const lastIsOp = isOperator(lastUnwrapped);
    const newIsNum = isNumber(newUnwrapped);
    const newIsOp = isOperator(newUnwrapped);

    // Rule 1: The first element must be a number.
    if (lastValue == null) {
        return newIsNum;
    }

    // Rule 2: Cannot have consecutive operators (Op -> Op)
    // Note: Swapping is handled by the caller, this checks appending.
    if (lastIsOp && newIsOp) return false;

    // Rule 3: Valid sequence transitions
    if (lastIsNum && newIsOp) return true; // Number → Operator
    if (lastIsOp && newIsNum) return true; // Operator → Number

    // Rule 4: Cannot have consecutive numbers (Num -> Num)
    if (lastIsNum && newIsNum) return false;

    return false;
}

/**
 * Checks if the entire expression is mathematically complete and ready for calculation (Num Op Num ... Num).
 * * @param {Object} expr - The current working expression (map of index:value).
 * @returns {boolean} True if the expression is structurally complete and valid.
 */
export function isValidExpression(expr) {
    const items = Object.keys(expr)
        .sort((a, b) => Number(a) - Number(b))
        .map(k => unwrap(expr[k]));

    const length = items.length;

    // Condition 1: Minimum length for calculation.
    if (length < 3) return false;

    // Condition 2: Must alternate, meaning the length must be odd to end on a number.
    if (length % 2 === 0) return false;

    // Condition 3: Must start with a number.
    if (!isNumber(items[0])) return false;

    // Condition 4: Must end with a number.
    const lastItem = items[length - 1];
    if (!isNumber(lastItem)) return false;

    // The other rules (alternating sequence) are implicitly handled if the input functions
    // correctly used canAppend to build the expression.
    return true;
}
