import { isNumber, isOperator } from "./ validations.js";

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
        // remove from available numbers
        delete numbers[key];

        // add to the working expression
        const newKey = String(Object.keys(expression).length + 1);
        expression[newKey] = expr;

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
        useButton.style.display = isValidExpression(expression) ? "inline-block" : "none";

        const keys = Object.keys(expression).sort((a, b) => Number(a) - Number(b));
        const last = expression[keys[keys.length - 1]];

        const lastIsNum = (typeof last === "object" && last.elements) || isNumber(last);
        operationButtons.forEach((btn) => (btn.disabled = !lastIsNum));
    }
    // --- Valid expres
    function isValidExpression(expr) {
        const items = Object.keys(expr)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => expr[k]);

        if (items.length < 3) return false;

        const isNumLike = (item) => {
            if (typeof item === "object" && item.elements) {
                return true; // any expression object counts as numeric term
            }
            return isNumber(item);
        };

        if (!isNumLike(items[0])) return false;

        for (let i = 1; i < items.length; i += 2) {
            const op = items[i];
            const nxt = items[i + 1];
            if (!isOperator(op) || !isNumLike(nxt)) return false;
        }

        return true;
    }


    function appendValue(value) {
        const keys = Object.keys(expression);
        const lastKey = keys[keys.length - 1];
        const last = expression[lastKey];

        if (isOperator(value)) {
            if (!last || isOperator(last)) return;
            expression[keys.length + 1] = value;
        } else {
            const valObj = (typeof value === "object" && value.elements)
                ? JSON.parse(JSON.stringify(value))
                : { value: Number(value), elements: [Number(value)] };
            expression[keys.length + 1] = valObj;
        }

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
            if (!this.disabled) appendValue(this.dataset.value);
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
