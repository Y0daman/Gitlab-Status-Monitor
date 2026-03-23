const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LIGHT,
  mapPipelineStatusToLight,
  aggregateLight,
  parseBranchesInput,
  isOngoingPipeline
} = require("../src/lib/status");

test("mapPipelineStatusToLight maps success to green", () => {
  assert.equal(mapPipelineStatusToLight("success"), LIGHT.GREEN);
});

test("mapPipelineStatusToLight maps running to yellow", () => {
  assert.equal(mapPipelineStatusToLight("running"), LIGHT.YELLOW);
});

test("mapPipelineStatusToLight maps failed to red", () => {
  assert.equal(mapPipelineStatusToLight("failed"), LIGHT.RED);
});

test("aggregateLight prioritizes red over yellow and green", () => {
  const light = aggregateLight([
    { pipelineStatus: "success" },
    { pipelineStatus: "running" },
    { pipelineStatus: "failed" }
  ]);

  assert.equal(light, LIGHT.RED);
});

test("aggregateLight returns gray when list empty", () => {
  assert.equal(aggregateLight([]), LIGHT.GRAY);
});

test("parseBranchesInput parses comma-separated values", () => {
  assert.deepEqual(parseBranchesInput("main, develop , release"), ["main", "develop", "release"]);
});

test("parseBranchesInput defaults to main", () => {
  assert.deepEqual(parseBranchesInput(""), ["main"]);
});

test("isOngoingPipeline identifies running states", () => {
  assert.equal(isOngoingPipeline("pending"), true);
  assert.equal(isOngoingPipeline("success"), false);
});
