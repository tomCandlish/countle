use pyo3::prelude::*;
use std::cmp::Ordering;

#[derive(Clone, Copy, Debug, PartialEq)]
enum Op {
    Add,
    Sub,
    Mul,
    Div,
}

impl Op {
    fn next(&self) -> Option<Op> {
        match self {
            Op::Add => Some(Op::Sub),
            Op::Sub => Some(Op::Mul),
            Op::Mul => Some(Op::Div),
            Op::Div => None,
        }
    }
    
    fn first() -> Op { Op::Add }
}

/// Helper function to replicate C++ std::next_permutation
fn next_permutation<T: Ord>(arr: &mut [T]) -> bool {
    let Some(i) = arr.windows(2).rposition(|w| w[0] < w[1]) else {
        return false;
    };
    let j = arr.iter().rposition(|x| x > &arr[i]).unwrap();
    arr.swap(i, j);
    arr[i + 1..].reverse();
    true
}

struct Evaluator {
    values: Vec<i32>,
    ops: Vec<Op>,
    // false = digit, true = operator
    selector: Vec<bool>, 
}

impl Evaluator {
    fn new(mut values: Vec<i32>) -> Self {
        values.sort();
        let num_values = values.len();
        let ops = vec![Op::first(); num_values - 1];
        
        // Initialize selector: e.g. for 3 nums: [0, 0, 0, 1, 1]
        // false (0) for number, true (1) for op
        let mut selector = vec![false; num_values];
        selector.extend(std::iter::repeat(true).take(num_values - 1));

        Evaluator { values, ops, selector }
    }

    fn is_selector_valid(&self) -> bool {
        let mut stack_depth = 0;
        for &is_op in &self.selector {
            if is_op {
                stack_depth -= 1;
                if stack_depth <= 0 {
                    return false;
                }
            } else {
                stack_depth += 1;
            }
        }
        stack_depth == 1
    }

    fn eval(&self, stack: &mut Vec<i32>) -> Option<i32> {
        stack.clear();
        let mut val_iter = self.values.iter();
        let mut op_iter = self.ops.iter();

        for &is_op in &self.selector {
            if !is_op {
                stack.push(*val_iter.next().unwrap());
                continue;
            }

            // In C++ code: top is grabbed, then popped.
            // stack: [..., A, B] -> Op comes -> Result
            let top = stack.pop()?; 
            let prev = stack.pop()?;
            let op = op_iter.next().unwrap();

            let res = match op {
                Op::Add => prev + top,
                Op::Sub => prev - top,
                Op::Mul => prev * top,
                Op::Div => {
                    if top == 0 || prev % top != 0 {
                        return None;
                    }
                    prev / top
                }
            };
            stack.push(res);
        }
        stack.pop()
    }

    fn to_string(&self) -> String {
        let mut stack: Vec<String> = Vec::new();
        let mut val_iter = self.values.iter();
        let mut op_iter = self.ops.iter();

        for &is_op in &self.selector {
            if !is_op {
                stack.push(val_iter.next().unwrap().to_string());
            } else {
                let right = stack.pop().unwrap();
                let left = stack.pop().unwrap();
                let op_char = match op_iter.next().unwrap() {
                    Op::Add => "+",
                    Op::Sub => "-",
                    Op::Mul => "*",
                    Op::Div => "/",
                };
                stack.push(format!("({} {} {})", left, op_char, right));
            }
        }
        stack.pop().unwrap_or_default()
    }

    fn next_ops(&mut self) -> bool {
        for op in self.ops.iter_mut().rev() {
            if let Some(next) = op.next() {
                *op = next;
                return true;
            }
            *op = Op::first();
        }
        false
    }
}

/// The main Python binding function
#[pyfunction]
fn solve(target: i32, numbers: Vec<i32>) -> Vec<String> {
    let mut evaluator = Evaluator::new(numbers);
    let mut results = Vec::new();
    let mut stack_cache = Vec::with_capacity(evaluator.selector.len());

    // 1. Loop through Selector Permutations
    loop {
        if evaluator.is_selector_valid() {
            // 2. Loop through Value Permutations
            loop {
                // 3. Loop through Operator Combinations
                loop {
                    if let Some(val) = evaluator.eval(&mut stack_cache) {
                        if val == target {
                            results.push(evaluator.to_string());
                        }
                    }
                    if !evaluator.next_ops() { break; }
                }
                
                if !next_permutation(&mut evaluator.values) { break; }
            }
        }
        if !next_permutation(&mut evaluator.selector) { break; }
    }
    
    results
}

/// The module definition exposed to Python
#[pymodule]
fn rust_solver(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(solve, m)?)?;
    Ok(())
}
