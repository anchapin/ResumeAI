with open("src/hooks/useATSCheck.ts", "r") as f:
    content = f.read()

# Node's setTimeout is not on window, it's global.
# And window is not defined. We can either mock window in the test,
# or we can remove the explicit `window.setTimeout` if it exists.
# But looking at src/hooks/useATSCheck.ts, there is no `window.setTimeout`. It just says `setTimeout`.
# Wait, why is it throwing `ReferenceError: window is not defined` inside `setTimeout`?
# Oh! The error is `ReferenceError: window is not defined` in `src/hooks/useATSCheck.ts:115`
