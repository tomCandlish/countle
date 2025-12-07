import { isNumber, isOperator, unwrap } from "./validations.js";

/**
 * Extracts the numeric value from an item (handles objects/strings).
 * Used internally by evaluate.
 */
function getVal(item) {
    if (item && typeof item === 'object' && 'value' in item) return item.value;
    return Number(item);
}

/**
 * Recursively/Iteratively evaluates a list of items using Order of Operations (PEMDAS/BODMAS).
 * @param {Array} items - Array of numbers/objects and operator strings
 * @returns {number} The calculated result.
 */
export function evaluate(items) {
    // 1. Create a shallow copy and unwrap nested objects to their values
    let tokens = items.map(x => {
        if (isOperator(x)) return x;
        return { value: getVal(x) }; // Wrap numbers for consistent processing
    });

    // 2. Pass 1: Multiplication and Division (Left to Right)
    for (let i = 0; i < tokens.length; i++) {
        const op = tokens[i];
        if (op === '×' || op === '*' || op === '÷' || op === '/') {
            const left = tokens[i - 1].value;
            const right = tokens[i + 1].value;
            let result = 0;

            if (op === '×' || op === '*') {
                result = left * right;
            } else {
                if (right === 0) return Infinity; // Avoid division by zero issues
                result = left / right;
            }

            // Splice: Remove "Left, Op, Right" (3 items) and insert "Result"
            tokens.splice(i - 1, 3, { value: result });
            i -= 1;
        }
    }

    // 3. Pass 2: Addition and Subtraction
    for (let i = 0; i < tokens.length; i++) {
        const op = tokens[i];
        if (op === '+' || op === '-') {
            const left = tokens[i - 1].value;
            const right = tokens[i + 1].value;
            let result = 0;

            if (op === '+') result = left + right;
            if (op === '-') result = left - right;

            tokens.splice(i - 1, 3, { value: result });
            i -= 1;
        }
    }

    // Return the final single value
    return tokens[0] ? tokens[0].value : 0;
}

/**
 * Checks if adding/swapping 'newValue' into 'currentExpr' 
 * results in an invalid mathematical state (specifically non-integers from division).
 * @param {Object} currentExpr - The current working expression map
 * @param {*} newValue - The number or operator being added/swapped
 * @returns {boolean} True if the move is safe (results in an integer or is not division)
 */
export function isSafeMove(currentExpr, newValue) {
    // 1. Convert current expression object to sorted array of values
    const keys = Object.keys(currentExpr).sort((a, b) => Number(a) - Number(b));
    let items = keys.map(k => unwrap(currentExpr[k]));

    // 2. Simulate the move (Swap or Append)
    const lastItem = items[items.length - 1];

    // Determine if we are swapping (Number on Number, or Op on Op)
    const isSwap = (isNumber(unwrap(lastItem)) && isNumber(unwrap(newValue))) ||
        (isOperator(lastItem) && isOperator(newValue));

    if (isSwap) {
        items.pop(); // Remove old item
    }
    // Only append if the new value is NOT an operator. 
    // If we're checking an operator swap, we only need to check if the new operator breaks the expression.
    if (!isOperator(newValue)) {
        items.push(unwrap(newValue)); // Add new number/expression
    }

    // Check if the resulting expression is long enough to have completed an operation
    if (items.length < 3) {
        return true;
    }

    const lastOpIndex = items.length - 2;
    const lastOp = items[lastOpIndex];


    // 3. Check specific rule: Integer Division
    if (lastOp === '÷' || lastOp === '/' || lastOp === '-') {
        // Find the full mathematical chain that precedes the divisor
        let chain = [];
        for (let i = lastOpIndex - 1; i >= 0; i--) {
            const token = items[i];
            // Stop at addition or subtraction boundaries (due to PEMDAS precedence)
            if (isOperator(token) && (token === '+' || token === '-')) {
                break;
            }
            chain.unshift(token);
        }

        if (lastOp === '÷' || lastOp === '/') {
            const numerator = evaluate(chain);
            const denominator = getVal(items[items.length - 1]);

            if (denominator === 0) return false; // Prevent division by zero

            // Must be divisible by the denominator to be a safe move
            if (numerator % denominator !== 0) {
                return false;
            }
        }
        if (evaluate(chain) <= getVal(items[items.length - 1])) return false;
    }

    return true;
}
