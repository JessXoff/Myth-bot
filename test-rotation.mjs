import { readFile } from "node:fs/promises";
import { getCurrentTarget, advance, isDueToPost } from "./src/state.js";

const myths = JSON.parse(await readFile(new URL("./myths.json", import.meta.url), "utf8"));

console.log("=== Rotation simulation (2 full cycles) ===");
let state = { mythIndex: 0, partIndex: 0, lastPostedAt: null, cycleCount: 0 };
const totalPartsExpected = myths.reduce((sum, m) => sum + m.parts.length, 0);
const seen = [];
for (let i = 0; i < totalPartsExpected * 2 + 2; i++) {
  const target = getCurrentTarget(myths, state);
  seen.push(
    `${i}: myth[${state.mythIndex}]=${target.myth.id} part ${target.partNumber}/${target.totalParts} (cycle ${state.cycleCount})`
  );
  state = advance(myths, state);
}
console.log(seen.join("\n"));

// Verify: after exactly totalPartsExpected steps, we should be back at mythIndex 0, partIndex 0, cycleCount 1
let checkState = { mythIndex: 0, partIndex: 0, lastPostedAt: null, cycleCount: 0 };
for (let i = 0; i < totalPartsExpected; i++) {
  checkState = advance(myths, checkState);
}
console.log("\n=== Wraparound check ===");
console.log(
  `After ${totalPartsExpected} advances: mythIndex=${checkState.mythIndex}, partIndex=${checkState.partIndex}, cycleCount=${checkState.cycleCount}`
);
if (checkState.mythIndex !== 0 || checkState.partIndex !== 0 || checkState.cycleCount !== 1) {
  throw new Error("WRAPAROUND FAILED - rotation logic is broken");
}
console.log("Wraparound OK.");

console.log("\n=== isDueToPost checks ===");
const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();

const cases = [
  { label: "never posted (lastPostedAt null)", state: { lastPostedAt: null }, expect: true },
  { label: "posted 10 hours ago", state: { lastPostedAt: hoursAgo(10) }, expect: false },
  { label: "posted 48 hours ago (day-2 mark, under 66h threshold)", state: { lastPostedAt: hoursAgo(48) }, expect: false },
  { label: "posted 67 hours ago (just over 66h threshold)", state: { lastPostedAt: hoursAgo(67) }, expect: true },
  { label: "posted 100 hours ago", state: { lastPostedAt: hoursAgo(100) }, expect: true },
];
for (const c of cases) {
  const result = isDueToPost(c.state);
  const status = result === c.expect ? "PASS" : "FAIL";
  console.log(`${status}: ${c.label} -> isDueToPost=${result} (expected ${c.expect})`);
  if (status === "FAIL") throw new Error("isDueToPost test failed: " + c.label);
}

console.log("\nAll state.js tests passed.");
