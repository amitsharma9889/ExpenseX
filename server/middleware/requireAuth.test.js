import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { requireAuth } from "./requireAuth.js";

const secret = "test-secret-that-is-long-enough-for-auth-tests";
process.env.JWT_SECRET = secret;

function runMiddleware(authorization) {
  const request = { headers: { authorization } };
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let nextCalled = false;

  requireAuth(request, response, () => {
    nextCalled = true;
  });

  return { request, response, nextCalled };
}

test("requires a bearer token", () => {
  const result = runMiddleware(undefined);

  assert.equal(result.response.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test("accepts a valid token and attaches its user id", () => {
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011" }, secret);
  const result = runMiddleware(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.equal(result.request.userId, "507f1f77bcf86cd799439011");
});

test("rejects invalid tokens", () => {
  const result = runMiddleware("Bearer not-a-token");

  assert.equal(result.response.statusCode, 401);
  assert.equal(result.nextCalled, false);
});
