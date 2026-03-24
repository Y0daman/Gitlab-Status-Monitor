const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeConfig, normalizeApiBaseUrl, resolveToken, DEFAULT_CONFIG } = require("../src/lib/config");

test("normalizeConfig keeps defaults", () => {
  const cfg = normalizeConfig({});
  assert.equal(cfg.pollIntervalSec, DEFAULT_CONFIG.pollIntervalSec);
  assert.equal(cfg.gitlab.apiBaseUrl, DEFAULT_CONFIG.gitlab.apiBaseUrl);
  assert.equal(cfg.ui.launchOnStartup, false);
  assert.deepEqual(cfg.ui.pausedEntries, []);
  assert.equal(cfg.ui.updatePath, DEFAULT_CONFIG.ui.updatePath);
  assert.deepEqual(cfg.projects, []);
});

test("normalizeConfig normalizes projects and branches", () => {
  const cfg = normalizeConfig({
    projects: [
      { id: " 123 ", branches: [" main ", "develop"] },
      { id: "", branches: ["main"] }
    ]
  });

  assert.deepEqual(cfg.projects, [{ id: "123", name: "", branches: ["main", "develop"] }]);
});

test("resolveToken picks config token first", () => {
  const token = resolveToken(
    { gitlab: { token: "abc" } },
    { TOKEN: "env-token", GITLAB_TOKEN: "fallback" }
  );
  assert.equal(token, "abc");
});

test("resolveToken falls back to TOKEN env", () => {
  const token = resolveToken(
    { gitlab: { token: "" } },
    { TOKEN: "env-token", GITLAB_TOKEN: "fallback" }
  );
  assert.equal(token, "env-token");
});

test("normalizeApiBaseUrl appends /api/v4 when missing", () => {
  assert.equal(normalizeApiBaseUrl("https://gitlab.com"), "https://gitlab.com/api/v4");
});

test("normalizeApiBaseUrl keeps existing api path", () => {
  assert.equal(normalizeApiBaseUrl("https://gitlab.example.com/custom/api/v4/"), "https://gitlab.example.com/custom/api/v4");
});
