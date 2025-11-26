import { isNumber, isOperator, isValidExpression, canAppend } from "./validations.js";

document.addEventListener("DOMContentLoaded", async function() {
    const numberContainer = document.getElementById("number-container");
    const expressionContainer = document.getElementById("expression-container");
    const expressionDisplay = document.getElementById("expression-display");
    const useButton = document.getElementById("use-expression");
    const operationButtons = document.querySelectorAll(".operation");

    let original_numbers = {};
    let numbers = {};
    let expression = {};


    // --- Fetch numbers from backend ---
    try {
        const response = await fetch("/src/daily_puzzle");
        const data = await response.json();

        // store as {1: num1, 2: num2, ...}
        original_numbers = Object.fromEntries(
            data.numbers.map((num, idx) => [String(idx + 1), { value: num, elements: [num] }])
        );
        numbers = { ...original_numbers };

        console.log("Original numbers:", original_numbers);
        console.log("Target:", data.target);

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
        // 1. Check the last item in the expression
        const exprKeys = Object.keys(expression).sort((a, b) => Number(a) - Number(b));
        const lastKey = exprKeys[exprKeys.length - 1];
        const lastItem = expression[lastKey];

        // 2. Determine if the last item is a Number/Expression (and not an operator)
        // In your code, operators are strings, numbers/expressions are objects.
        const isLastItemNumber = lastItem && (typeof lastItem === 'object');

        if (isLastItemNumber) {
            // --- SWAP LOGIC ---
            // A. Return the last item back to the 'numbers' pool
            // We create a unique key to ensure no collisions in the numbers object
            const returnKey = `returned_${Date.now()}`;
            numbers[returnKey] = lastItem;

            // B. Remove it from the expression
            delete expression[lastKey];
        }

        // 3. Standard Logic (Append new item)
        // Remove the *new* item from available numbers
        delete numbers[key];

        // Add to the working expression (Determine new key based on current length)
        // We recalculate length because we might have just deleted an item above
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

            // BASE CASE: flat expression → no bubble
            if (!hasNested) {
                const span = document.createElement("span");
                span.className = "expr-flat";
                span.textContent = node.elements.join(" ");
                return span;
            }

            // depth = 0 → outermost
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

        useButton.style.display = isValidExpression(expression)
            ? "inline-block"
            : "none";

        // Update operator buttons (Keep validation here: can't put + after +)
        operationButtons.forEach(btn => {
            const op = btn.dataset.value;
            btn.disabled = !canAppend(last, op);
        });

        // Update number buttons
        document.querySelectorAll(".btn-number").forEach(btn => {
            // CHANGE: We always allow numbers to be clicked. 
            // If it's a valid append, it appends. If it's a swap, moveToExpression handles it.
            btn.disabled = false;
        });
    }


    function appendValue(value) {
        const keys = Object.keys(expression).sort((a, b) => Number(a) - Number(b));
        const lastKey = keys[keys.length - 1];
        const last = expression[lastKey];

        // --- NEW OPERATOR SWAP LOGIC ---
        // Determine if the last item is an operator (operators are stored as strings)
        if (typeof last === 'string' && isOperator(last)) {
            // Swap: Delete the old operator
            delete expression[lastKey];
        }

        // Prevent invalid input (e.g., Number after Operator, which should never happen here
        // if the UI is correct, but kept for safety in case of bugs)
        if (last && !isOperator(last) && !canAppend(last, value)) {
            console.warn("Rejected invalid input:", last, "→", value);
            return;
        }

        // Standard Logic (Append new operator)
        let valObj;
        // Since operators are strings, we just use the value directly
        valObj = value;

        // Use the next sequential key for the new entry
        const nextIndex = Object.keys(expression).length + 1;
        expression[String(nextIndex)] = valObj;

        renderExpression(); // This calls updateDisplay() which updates button states
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
        // Sort keys numerically to preserve button order
        const exprValues = Object.keys(expression)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => expression[k]);

        if (exprValues.length < 3) {
            alert("Incomplete expression");
            return;
        }

        // Wrap current working expression as one object
        const newExprObj = {
            value: null,
            elements: exprValues
        };

        const rawExpr = buildEvalString(newExprObj)
            .replace(/×/g, "*")
            .replace(/÷/g, "/");

        try {
            const result = eval(rawExpr);

            if (Number.isFinite(result)) {
                totalExpressions++;
                const newKey = String(totalExpressions + 6);

                newExprObj.value = result;
                numbers[newKey] = newExprObj;

                // Reset and re-render
                expression = {};
                renderNumberButtons();
                renderExpression();
            } else {
                alert("Invalid expression (not finite)");
            }
        } catch (e) {
            alert("Invalid expression");
            console.error("Eval error:", e, "\nRaw expression:", rawExpr);
        }
    });
    renderExpression();
})
