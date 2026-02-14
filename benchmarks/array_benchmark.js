import { performance } from 'perf_hooks';

// Simple logger for benchmarks
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

const iterations = 50000000;

logger.info(`Running benchmark with ${iterations} iterations...`);

let dummy = 0;

// Scenario 1: Inline Array Creation
let start = performance.now();
for (let i = 0; i < iterations; i++) {
    const arr = ['Resume', 'Cover Letter', 'Analysis'];
    dummy += arr.length;
}
let end = performance.now();
const inlineDuration = end - start;
logger.info(`Inline Array Creation: ${inlineDuration.toFixed(2)} ms`);

// Scenario 2: Constant Array
const TABS = ['Resume', 'Cover Letter', 'Analysis'];
start = performance.now();
for (let i = 0; i < iterations; i++) {
    dummy += TABS.length;
}
end = performance.now();
const constantDuration = end - start;
logger.info(`Constant Array: ${constantDuration.toFixed(2)} ms`);

logger.info(`Dummy: ${dummy}`);
