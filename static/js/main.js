import { isNumber, isOperator, isValidExpression, canAppend } from "./validations.js";
import { evaluate, isSafeMove } from "./calculator.js";

document.addEventListener("DOMContentLoaded", async function() {
    const numberContainer = document.getElementById("number-container");
    const expressionContainer = document.getElementById("expression-container");
    const useButton = document.getElementById("use-expression");
    const submitButton = document.createElement("button"); // Create the submit button dynamically
    submitButton.id = "submit-puzzle";
    submitButton.className = "btn btn-primary mt-3";
    submitButton.textContent = "Submit Solution";
    submitButton.style.display = "none";
    submitButton.style.marginLeft = "10px";

    // Insert the submit button next to the use button
    useButton.parentElement.insertBefore(submitButton, useButton.nextSibling);

    const operationButtons = document.querySelectorAll(".operation");

    let original_numbers = {};
    let numbers = {};
    let expression = {};
    let puzzleTarget = 0; // Stored target number

    // --- Fetch numbers from backend ---
    try {
        // Reverting to the backend fetch call as requested
        const response = await fetch("/src/daily_puzzle");
        const data = await response.json();

        // store as {1: num1, 2: num2, ...}
        original_numbers = Object.fromEntries(
            data.numbers.map((num, idx) => [String(idx + 1), { value: num, elements: [num] }])
        );
        numbers = { ...original_numbers };
        puzzleTarget = data.target;

        console.log("Original numbers:", original_numbers);
        console.log("Target:", puzzleTarget);

        renderNumberButtons();
    } catch (err) {
        console.error("Error fetching numbers:", err);
    }

    function renderNumberButtons() {
        numberContainer.innerHTML = "";

        Object.entries(numbers).forEach(([key, expr]) => {
            const btn = document.createElement("button");
            btn.dataset.key = key;

            const hasNested = expr.elements.some(el => typeof el === "object" && el.elements);

            if (!hasNested) {
                // --- Base number: round button ---
                btn.className = "number-box btn-number btn-round";
                btn.textContent = expr.value;
            } else {
                // --- Nested expression: pill-shaped blob ---
                btn.className = "number-box btn-number btn-expression";
                const renderedExpr = renderExpressionButton(expr);
                btn.appendChild(renderedExpr);
            }

            btn.addEventListener("click", () => moveToExpression(key, expr));
            numberContainer.appendChild(btn);
        });
    }

    function moveToExpression(key, expr) {
        // --- NEW VALIDATION: Check for non-integer OR negative result ---
        // If the move is unsafe, we simply return (ignore input) without alerting.
        if (!isSafeMove(expression, expr)) {
            return;
        }

        // 1. Check the last item in the expression (for swap logic)
        const exprKeys = Object.keys(expression).sort((a, b) => Number(a) - Number(b));
        const lastKey = exprKeys[exprKeys.length - 1];
        const lastItem = expression[lastKey];

        // Operators are strings, numbers/expressions are objects
        const isLastItemNumber = lastItem && (typeof lastItem === 'object');

        if (isLastItemNumber) {
            // --- SWAP LOGIC: Return the last number/expression to the pool ---
            const returnKey = `returned_${Date.now()}`;
            numbers[returnKey] = lastItem;
            delete expression[lastKey];
        }

        // 2. Standard Logic (Append new item)
        delete numbers[key];

        const nextIndex = Object.keys(expression).length + 1;
        expression[String(nextIndex)] = expr;

        renderNumberButtons();
        renderExpression();
    }


    function renderExpression() {
        expressionContainer.innerHTML = "";

        const hasItems = Object.keys(expression).length > 0;
        if (!hasItems) {
            expressionContainer.style.display = "none";
            return;
        }

        expressionContainer.style.display = "inline-flex";

        const exprValues = Object.values(expression);
        const exprObj = { elements: exprValues };

        const rendered = renderExpressionButton(exprObj);
        expressionContainer.appendChild(rendered);

        updateDisplay();
    }


    function renderExpressionButton(exprObj) {
        function countDepth(node) {
            if (!node.elements) return 0;
            let max = 0;
            for (const el of node.elements) {
                if (typeof el === "object" && el.elements) {
                    max = Math.max(max, 1 + countDepth(el));
                }
            }
            return max;
        }

        const maxDepth = countDepth(exprObj);

        function build(node, depth) {
            const hasNested = node.elements.some(el => typeof el === "object" && el.elements);

            if (!hasNested) {
                const span = document.createElement("span");
                span.className = "expr-flat";
                span.textContent = node.elements.join(" ");
                return span;
            }

            let layer = (maxDepth - depth) + 1;
            if (layer > 6) layer = 6;

            const wrapper = document.createElement("div");
            wrapper.className = `expr-layer expr-layer-${layer}`;

            const inner = document.createElement("div");
            inner.className = "expr-inner";

            for (const el of node.elements) {
                if (typeof el === "object" && el.elements) {
                    inner.appendChild(build(el, depth + 1));
                } else {
                    const span = document.createElement("span");
                    span.className = "expr-symbol";
                    span.textContent = el;
                    inner.appendChild(span);
                }
            }

            wrapper.appendChild(inner);
            return wrapper;
        }

        return build(exprObj, 0);
    }

    function updateDisplay() {
        const values = Object.keys(expression)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => expression[k]);

        const last = values[values.length - 1];
        const hasItems = values.length > 0;

        const valid = isValidExpression(expression);

        // Check if a single number/expression is in the working area
        let canSubmitSingle = false;
        if (values.length === 1 && typeof values[0] === 'object' && 'value' in values[0]) {
            // If there is exactly one number/expression in the working area, 
            // it is ready to be submitted as the final result (even if it's wrong)
            canSubmitSingle = true;
        }

        // The "Use" button only appears for complete expressions (length >= 3, odd)
        useButton.style.display = valid ? "inline-block" : "none";

        // The "Submit" button appears for complete expressions OR if a single number is ready for submission
        const isReadyForSubmit = valid || canSubmitSingle;
        submitButton.style.display = isReadyForSubmit ? "inline-block" : "none";

        // Update operator buttons
        const isLastOperator = typeof last === 'string' && isOperator(last);

        operationButtons.forEach(btn => {
            const op = btn.dataset.value;

            // Enabled if: 1. Valid APPEND (Num → Op), OR 2. Operator SWAP (Op → Op)
            const shouldBeEnabled = canAppend(last, op) || isLastOperator;

            btn.disabled = !shouldBeEnabled;
        });

        // Update number buttons: Always enabled for swap logic
        document.querySelectorAll(".btn-number").forEach(btn => {
            btn.disabled = false;
        });
    }


    function appendValue(value) {
        const keys = Object.keys(expression).sort((a, b) => Number(a) - Number(b));
        const lastKey = keys[keys.length - 1];
        const last = expression[lastKey];

        const isNewOperator = isOperator(value);
        const isLastOperator = typeof last === 'string' && isOperator(last);

        // --- 1. OPERATOR REPLACEMENT (SWAP) LOGIC ---
        if (isLastOperator && isNewOperator) {
            // --- NEW VALIDATION: Check for non-integer OR negative result ---
            if (!isSafeMove(expression, value)) {
                // Ignore unsafe swaps silently
                return;
            }

            const targetKey = lastKey;
            delete expression[lastKey];

            expression[targetKey] = value;
            renderExpression();
            return;
        }

        // --- 2. REGULAR APPEND VALIDATION LOGIC (Must be Num → Op) ---
        if (!canAppend(last, value)) {
            console.warn("Rejected invalid input:", last, "→", value);
            return;
        }

        // --- 3. STANDARD APPEND LOGIC (Num → Op) ---
        const nextIndex = keys.length + 1;
        expression[String(nextIndex)] = value;

        renderExpression();
    }


    function buildEvalString(exprObj) {
        if (!exprObj || !exprObj.elements) return exprObj?.value ?? "";
        if (exprObj.elements.length === 1 && typeof exprObj.elements[0] !== "object") {
            return String(exprObj.elements[0]);
        }

        const parts = exprObj.elements.map(el => {
            if (typeof el === "object" && el.elements) {
                return `(${buildEvalString(el)})`;
            }
            return el;
        });

        return parts.join(" ");
    }

    // --- Operator buttons ---
    operationButtons.forEach((button) => {
        button.addEventListener("click", function() {
            appendValue(this.dataset.value);
        });
    });

    // --- Expression use button ---
    let totalExpressions = 0;


    useButton.addEventListener("click", function() {
        const exprValues = Object.keys(expression)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => expression[k]);

        if (exprValues.length < 3) {
            alert("Incomplete expression");
            return;
        }

        // 1. Evaluate using the robust function
        const result = evaluate(exprValues);

        if (Number.isFinite(result)) {
            // Must be an integer result
            if (!Number.isInteger(result)) {
                // Reject silently (as requested)
                return;
            }
            // Check for negatives
            if (result < 0) {
                // Reject silently (as requested)
                return;
            }

            totalExpressions++;
            const newKey = String(totalExpressions + 6);

            const newExprObj = {
                value: result,
                elements: exprValues
            };

            numbers[newKey] = newExprObj;

            // Reset and re-render
            expression = {};
            renderNumberButtons();
            renderExpression();
        } else {
            alert("Invalid expression (division by zero or other error)");
            console.error("Evaluation error, result:", result);
        }
    });

    // --- Submit puzzle button ---
    submitButton.addEventListener("click", function() {
        const exprValues = Object.keys(expression)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => expression[k]);

        const isSingleElement = exprValues.length === 1;

        // Only block if it's not a single element AND it's not a valid full expression
        if (!isValidExpression(expression) && !isSingleElement) {
            alert("The current entry is not a complete expression.");
            return;
        }

        const currentTotal = evaluate(exprValues);

        // Final sanity checks
        if (!Number.isInteger(currentTotal)) {
            alert(`Final result (${currentTotal}) is not an integer!`);
            return;
        }

        if (currentTotal === puzzleTarget) {
            alert(`🎉 CORRECT! ${puzzleTarget} = ${buildEvalString({ elements: exprValues })}`);
            // Add win/reset logic here
        } else {
            alert(`Incorrect. You reached ${currentTotal}. The target is ${puzzleTarget}.`);
        }
    });

    renderExpression();
});
