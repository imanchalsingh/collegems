import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateCondition } from "../engine/workflowStateMachine.js";

describe("workflowStateMachine conditions", () => {
  it("evaluates numeric gt for leave days", () => {
    assert.equal(
      evaluateCondition({ field: "days", operator: "gt", value: 3 }, { days: 5 }),
      true
    );
    assert.equal(
      evaluateCondition({ field: "days", operator: "gt", value: 3 }, { days: 2 }),
      false
    );
  });

  it("evaluates equality and contains", () => {
    assert.equal(
      evaluateCondition({ field: "type", operator: "eq", value: "medical" }, { type: "medical" }),
      true
    );
    assert.equal(
      evaluateCondition(
        { field: "reason", operator: "contains", value: "exam" },
        { reason: "Final exam clash" }
      ),
      true
    );
  });
});
