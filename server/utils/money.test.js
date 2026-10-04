import test from "node:test";
import assert from "node:assert/strict";
import { rupeesToPaise } from "./money.js";

test("converts decimal rupee amounts to exact integer paise", () => {
  assert.equal(rupeesToPaise("12.34"), 1234);
  assert.equal(rupeesToPaise("12.3"), 1230);
  assert.equal(rupeesToPaise("12"), 1200);
});

test("rejects missing, invalid, zero, and overly precise amounts", () => {
  assert.equal(rupeesToPaise(""), null);
  assert.equal(rupeesToPaise("0.00"), null);
  assert.equal(rupeesToPaise("-1"), null);
  assert.equal(rupeesToPaise("1.234"), null);
  assert.equal(rupeesToPaise("abc"), null);
});
