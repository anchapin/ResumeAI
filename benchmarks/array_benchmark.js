/* eslint-disable no-console */
import { performance } from 'perf_hooks';

const iterations = 50000000;

console.log(`Running benchmark with ${iterations} iterations...`);

let dummy = 0;

// Scenario 1: Inline Array Creation
let start = performance.now();
for (let i = 0; i < iterations; i++) {
  const arr = ['Resume', 'Cover Letter', 'Analysis'];
  dummy += arr.length;
}
let end = performance.now();
const inlineDuration = end - start;
console.log(`Inline Array Creation: ${inlineDuration.toFixed(2)} ms`);

// Scenario 2: Constant Array
const TABS = ['Resume', 'Cover Letter', 'Analysis'];
start = performance.now();
for (let i = 0; i < iterations; i++) {
  dummy += TABS.length;
}
end = performance.now();
const constantDuration = end - start;
console.log(`Constant Array: ${constantDuration.toFixed(2)} ms`);

console.log(`Dummy: ${dummy}`);
