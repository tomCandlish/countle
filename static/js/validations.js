
// validation.js

/**
 * Checks if a value is a numeric value.
 * @param {any} value 
 * @returns {boolean}
 */
export function isNumber(value) {
    if (typeof value === "object" && value !== null && Array.isArray(value.elements)) {
        return Number.isFinite(value.value);
    }
    return !isNaN(value);
}

/**
 * Checks if a value is an operator (+, -, ×, ÷)
 * @param {any} value 
 * @returns {boolean}
 */
export function isOperator(value) {
    return ["+", "-", "×", "÷"].includes(value);
}

/**
 * Determines if a value can be appended to the current expression
 * @param {object|number|string} lastValue - last value in current expression
 * @param {object|number|string} newValue - value trying to append
 * @returns {boolean}
 */
export function canAppend(lastValue, newValue) {
    if (!lastValue) {
        return isNumber(newValue);
    }

    if (isOperator(lastValue) && isOperator(newValue)) return false;
    if (isNumber(lastValue) && isNumber(newValue)) return false;

    if (isOperator(newValue)) {
        return isNumber(lastValue);
    } else {
        return !isNumber(lastValue) || isOperator(lastValue) ? true : false;
    }
}

/**
 * Checks if an expression is valid (for "use" button)
 * @param {object} expr - expression object {1: ..., 2: ..., ...}
 * @returns {boolean}
 */
export function isValidExpression(expr) {
    const items = Object.keys(expr)
        .sort((a, b) => Number(a) - Number(b))
        .map(k => expr[k]);

    if (items.length < 3) return false;

    const isNumLike = (item) => isNumber(item);

    if (!isNumLike(items[0])) return false;

    for (let i = 1; i < items.length; i += 2) {
        const op = items[i];
        const nxt = items[i + 1];
        if (!isOperator(op) || !isNumLike(nxt)) return false;
    }

    return true;
}
