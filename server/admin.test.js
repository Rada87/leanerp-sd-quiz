// node --test server/admin.test.js
import test from "node:test";
import assert from "node:assert/strict";

// The module reads ADMIN_PASSWORD once at import time, so each scenario gets
// its own fresh import with the environment already in place.
async function loadAdmin(password) {
  if (password === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = password;
  return import(`./admin.js?case=${Math.random()}`);
}

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function requestWithToken(token) {
  return { get: (name) => (name.toLowerCase() === "x-admin-token" ? token : undefined), query: {} };
}

test("the right password opens a session, the wrong one does not", async () => {
  const admin = await loadAdmin("s3cret!");

  assert.equal(admin.openSession("nope", "1.2.3.4").error, "invalid_password");
  const opened = admin.openSession("s3cret!", "1.2.3.4");
  assert.equal(opened.error, undefined);
  assert.match(opened.token, /^[0-9a-f]{64}$/);
  assert.ok(admin.isValidToken(opened.token));
});

test("a near miss is still a miss", async () => {
  const admin = await loadAdmin("s3cret!");
  for (const candidate of ["s3cret", "s3cret!!", "S3cret!", "", null, undefined, 42]) {
    assert.equal(admin.openSession(candidate, "1.2.3.4").error, "invalid_password", String(candidate));
  }
});

test("closing a session invalidates its token", async () => {
  const admin = await loadAdmin("s3cret!");
  const { token } = admin.openSession("s3cret!", "1.2.3.4");
  admin.closeSession(token);
  assert.equal(admin.isValidToken(token), false);
});

test("an unknown or empty token is never valid", async () => {
  const admin = await loadAdmin("s3cret!");
  for (const token of ["", "deadbeef", null, undefined, 0]) {
    assert.equal(admin.isValidToken(token), false, String(token));
  }
});

test("repeated failures throttle that address only", async () => {
  const admin = await loadAdmin("s3cret!");
  const attacker = "9.9.9.9";
  for (let i = 0; i < 20; i++) admin.openSession("guess", attacker);

  assert.equal(admin.openSession("guess", attacker).error, "too_many_attempts");
  // Even the correct password waits out the window from a throttled address...
  assert.equal(admin.openSession("s3cret!", attacker).error, "too_many_attempts");
  // ...while the person at the stand is unaffected.
  assert.equal(admin.openSession("s3cret!", "10.0.0.1").error, undefined);
});

test("a successful login clears that address's failure count", async () => {
  const admin = await loadAdmin("s3cret!");
  const ip = "10.0.0.2";
  for (let i = 0; i < 19; i++) admin.openSession("guess", ip);
  assert.equal(admin.openSession("s3cret!", ip).error, undefined);
  for (let i = 0; i < 19; i++) admin.openSession("guess", ip);
  assert.equal(admin.openSession("s3cret!", ip).error, undefined);
});

test("requireAdmin passes a valid token and rejects everything else", async () => {
  const admin = await loadAdmin("s3cret!");
  const { token } = admin.openSession("s3cret!", "1.2.3.4");

  let called = false;
  admin.requireAdmin(requestWithToken(token), response(), () => { called = true; });
  assert.ok(called);

  const res = response();
  admin.requireAdmin(requestWithToken("wrong"), res, () => assert.fail("must not pass"));
  assert.equal(res.statusCode, 401);
});

test("without ADMIN_PASSWORD every maintenance route stays shut", async () => {
  const admin = await loadAdmin(undefined);

  assert.equal(admin.openSession("", "1.2.3.4").error, "not_configured");
  assert.equal(admin.openSession("anything", "1.2.3.4").error, "not_configured");

  const res = response();
  admin.requireAdmin(requestWithToken(""), res, () => assert.fail("must not pass"));
  assert.equal(res.statusCode, 503);
});
