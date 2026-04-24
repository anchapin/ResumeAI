# The error is that during React's state update, `window` is accessed by React DOM's scheduler, but it's not defined.
# Why would `window` not be defined in JSDOM?
# In node environments, React 19 sometimes has issues if JSDOM is not fully polyfilling the event loop properly, or if vitest's mock destroys it.
# Maybe we can wrap the fetch with `act()` correctly in the test.
