import test from "node:test";
import assert from "node:assert/strict";
import { calculateTripBalances } from "./tripBalances.js";

test("calculates equal shares and who owes whom", () => {
  const result = calculateTripBalances({
    members: [
      { _id: "amit", name: "Amit" },
      { _id: "ravi", name: "Ravi" },
      { _id: "sana", name: "Sana" }
    ],
    expenses: [
      { amountPaise: 90000, paidBy: "amit" },
      { amountPaise: 30000, paidBy: "ravi" }
    ]
  });

  assert.equal(result.totalPaise, 120000);
  assert.deepEqual(
    result.members.map(({ name, paidPaise, sharePaise, balancePaise }) => ({
      name,
      paidPaise,
      sharePaise,
      balancePaise
    })),
    [
      { name: "Amit", paidPaise: 90000, sharePaise: 40000, balancePaise: 50000 },
      { name: "Ravi", paidPaise: 30000, sharePaise: 40000, balancePaise: -10000 },
      { name: "Sana", paidPaise: 0, sharePaise: 40000, balancePaise: -40000 }
    ]
  );
  assert.deepEqual(result.settlements, [
    { from: "Ravi", to: "Amit", amountPaise: 10000 },
    { from: "Sana", to: "Amit", amountPaise: 40000 }
  ]);
});

test("allocates indivisible paise and settles exactly", () => {
  const result = calculateTripBalances({
    members: [
      { _id: "one", name: "One" },
      { _id: "two", name: "Two" },
      { _id: "three", name: "Three" }
    ],
    expenses: [{ amountPaise: 100, paidBy: "one" }]
  });

  assert.deepEqual(
    result.members.map((member) => member.sharePaise),
    [34, 33, 33]
  );
  assert.equal(result.settlements.reduce((sum, item) => sum + item.amountPaise, 0), 66);
});

test("reports zero balances before trip expenses are recorded", () => {
  const result = calculateTripBalances({
    members: [{ _id: "one", name: "One" }, { _id: "two", name: "Two" }],
    expenses: []
  });

  assert.equal(result.totalPaise, 0);
  assert.deepEqual(result.settlements, []);
  assert.ok(result.members.every((member) => member.balancePaise === 0));
});
